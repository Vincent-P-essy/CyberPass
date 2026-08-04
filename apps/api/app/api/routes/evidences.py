import json
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy import delete, func, select

from app.api.dependencies import Csrf, CurrentUser, Db, Tenant, TenantContext, require_min_role
from app.core.config import get_settings
from app.core.security import (
    client_key,
    create_download_token,
    decode_download_token,
    identity_key,
    rate_limiter,
)
from app.models import (
    Confidentiality,
    Evidence,
    EvidenceControlLink,
    EvidenceType,
    EvidenceVersion,
    OrganizationControl,
    Role,
)
from app.schemas import EvidenceOut, EvidenceUpdate
from app.services.audit import add_audit_event
from app.services.storage import StorageError, build_storage, scan_for_malware, validate_upload

router = APIRouter(tags=["Preuves"])
settings = get_settings()
storage = build_storage(settings)


def _parse_control_ids(value: str | None) -> list[uuid.UUID]:
    if not value:
        return []
    try:
        raw = json.loads(value) if value.lstrip().startswith("[") else value.split(",")
        ids = [uuid.UUID(str(item).strip()) for item in raw if str(item).strip()]
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="controlIds est invalide") from exc
    return list(dict.fromkeys(ids))


def _validate_controls(db: Db, organization_id: uuid.UUID, control_ids: list[uuid.UUID]) -> None:
    if not control_ids:
        return
    found = set(
        db.scalars(
            select(OrganizationControl.control_id).where(
                OrganizationControl.organization_id == organization_id,
                OrganizationControl.control_id.in_(control_ids),
            )
        ).all()
    )
    if found != set(control_ids):
        raise HTTPException(status_code=422, detail="Un ou plusieurs contrôles sont indisponibles")


def _evidence_out(db: Db, evidence: Evidence) -> EvidenceOut:
    control_ids = db.scalars(
        select(EvidenceControlLink.control_id).where(
            EvidenceControlLink.organization_id == evidence.organization_id,
            EvidenceControlLink.evidence_id == evidence.id,
        )
    ).all()
    return EvidenceOut(
        id=evidence.id,
        title=evidence.title,
        description=evidence.description,
        public_summary=evidence.public_summary,
        evidence_type=evidence.evidence_type,
        confidentiality=evidence.confidentiality,
        source=evidence.source,
        original_filename=evidence.original_filename,
        mime_type=evidence.mime_type,
        size_bytes=evidence.size_bytes,
        collected_at=evidence.collected_at,
        expires_at=evidence.expires_at,
        sha256=evidence.sha256,
        control_ids=list(control_ids),
        has_file=bool(evidence.object_key),
        created_at=evidence.created_at,
        updated_at=evidence.updated_at,
    )


async def _read_upload(upload: UploadFile) -> bytes:
    content = await upload.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux")
    return content


@router.get("/evidences", response_model=list[EvidenceOut])
def list_evidences(
    tenant: Tenant,
    db: Db,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[EvidenceOut]:
    evidences = db.scalars(
        select(Evidence)
        .where(Evidence.organization_id == tenant.organization_id, Evidence.deleted_at.is_(None))
        .order_by(Evidence.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_evidence_out(db, item) for item in evidences]


@router.post("/evidences", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
    title: Annotated[str, Form(min_length=2, max_length=240)],
    evidence_type: Annotated[EvidenceType, Form(alias="evidenceType")],
    confidentiality: Annotated[Confidentiality, Form()],
    description: Annotated[str | None, Form(max_length=5000)] = None,
    public_summary: Annotated[str | None, Form(alias="publicSummary", max_length=1000)] = None,
    source: Annotated[str | None, Form(max_length=500)] = None,
    collected_at: Annotated[datetime | None, Form(alias="collectedAt")] = None,
    expires_at: Annotated[datetime | None, Form(alias="expiresAt")] = None,
    control_ids: Annotated[str | None, Form(alias="controlIds")] = None,
    file: Annotated[UploadFile | None, File()] = None,
) -> EvidenceOut:
    rate_limiter.check(
        client_key(request, "file-operation", f"{tenant.organization_id}:{user.id}"),
        settings.upload_rate_limit,
        settings.file_rate_window_seconds,
    )
    evidence_count = (
        db.scalar(
            select(func.count(Evidence.id)).where(
                Evidence.organization_id == tenant.organization_id
            )
        )
        or 0
    )
    if evidence_count >= settings.tenant_evidence_quota:
        raise HTTPException(status_code=409, detail="Quota de preuves atteint pour l'organisation")
    parsed_control_ids = _parse_control_ids(control_ids)
    _validate_controls(db, tenant.organization_id, parsed_control_ids)
    for field_name, value in (("collectedAt", collected_at), ("expiresAt", expires_at)):
        if value is not None and value.tzinfo is None:
            raise HTTPException(
                status_code=422, detail=f"{field_name} doit inclure un fuseau horaire"
            )
    if confidentiality == Confidentiality.SHARED_SUMMARY and not public_summary:
        raise HTTPException(
            status_code=422, detail="Un résumé public est requis pour SHARED_SUMMARY"
        )
    stored = None
    if file is not None:
        content = await _read_upload(file)
        try:
            safe_name, mime_type = validate_upload(
                file.filename or "document", file.content_type, content, settings.max_upload_bytes
            )
            scan_for_malware(content)
            stored = storage.put(tenant.organization_id, safe_name, mime_type, content)
        except StorageError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    evidence = Evidence(
        organization_id=tenant.organization_id,
        title=title.strip(),
        description=description.strip() if description else None,
        public_summary=public_summary.strip() if public_summary else None,
        evidence_type=evidence_type,
        confidentiality=confidentiality,
        source=source.strip() if source else None,
        collected_at=collected_at.astimezone(UTC) if collected_at else datetime.now(UTC),
        expires_at=expires_at.astimezone(UTC) if expires_at else None,
        owner_id=user.id,
        object_key=stored.object_key if stored else None,
        original_filename=stored.original_filename if stored else None,
        mime_type=stored.mime_type if stored else None,
        size_bytes=stored.size_bytes if stored else None,
        sha256=stored.sha256 if stored else None,
    )
    try:
        db.add(evidence)
        db.flush()
        if stored:
            db.add(
                EvidenceVersion(
                    organization_id=tenant.organization_id,
                    evidence_id=evidence.id,
                    version_number=1,
                    object_key=stored.object_key,
                    original_filename=stored.original_filename,
                    mime_type=stored.mime_type,
                    size_bytes=stored.size_bytes,
                    sha256=stored.sha256,
                    created_by_id=user.id,
                )
            )
        db.add_all(
            EvidenceControlLink(
                organization_id=tenant.organization_id,
                evidence_id=evidence.id,
                control_id=control_id,
            )
            for control_id in parsed_control_ids
        )
        add_audit_event(
            db,
            request,
            "evidence.created",
            "evidence",
            evidence.id,
            tenant.organization_id,
            user,
            {
                "type": evidence_type.value,
                "confidentiality": confidentiality.value,
                "hasFile": bool(stored),
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        if stored:
            storage.delete(stored.object_key)
        raise
    return _evidence_out(db, evidence)


@router.get("/evidences/{evidence_id}", response_model=EvidenceOut)
def get_evidence(evidence_id: uuid.UUID, tenant: Tenant, db: Db) -> EvidenceOut:
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == tenant.organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Preuve introuvable")
    return _evidence_out(db, evidence)


@router.patch("/evidences/{evidence_id}", response_model=EvidenceOut)
def update_evidence(
    evidence_id: uuid.UUID,
    payload: EvidenceUpdate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
) -> EvidenceOut:
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == tenant.organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Preuve introuvable")
    values = payload.model_dump(exclude_unset=True)
    new_control_ids = values.pop("control_ids", None)
    if new_control_ids is not None:
        _validate_controls(db, tenant.organization_id, new_control_ids)
        db.execute(
            delete(EvidenceControlLink).where(
                EvidenceControlLink.organization_id == tenant.organization_id,
                EvidenceControlLink.evidence_id == evidence.id,
            )
        )
        db.add_all(
            EvidenceControlLink(
                organization_id=tenant.organization_id,
                evidence_id=evidence.id,
                control_id=control_id,
            )
            for control_id in new_control_ids
        )
    for key, value in values.items():
        setattr(evidence, key, value)
    if evidence.confidentiality == Confidentiality.SHARED_SUMMARY and not evidence.public_summary:
        raise HTTPException(
            status_code=422, detail="Un résumé public est requis pour SHARED_SUMMARY"
        )
    add_audit_event(
        db, request, "evidence.updated", "evidence", evidence.id, tenant.organization_id, user
    )
    db.commit()
    return _evidence_out(db, evidence)


@router.delete("/evidences/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(
    evidence_id: uuid.UUID,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ADMIN))],
) -> None:
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == tenant.organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Preuve introuvable")
    evidence.deleted_at = datetime.now(UTC)
    add_audit_event(
        db, request, "evidence.deleted", "evidence", evidence.id, tenant.organization_id, user
    )
    db.commit()


def _download_response(evidence: Evidence) -> Response:
    if not evidence.object_key or not evidence.original_filename:
        raise HTTPException(status_code=404, detail="Aucun fichier associé")
    external_url = storage.signed_download_url(evidence.object_key, evidence.original_filename)
    if external_url:
        return RedirectResponse(
            external_url,
            status_code=307,
            headers={"Cache-Control": "private, no-store", "Pragma": "no-cache"},
        )
    path = storage.local_path(evidence.object_key)
    if path is None:
        raise HTTPException(status_code=404, detail="Fichier indisponible")
    return FileResponse(
        path,
        media_type=evidence.mime_type,
        filename=evidence.original_filename,
        headers={"Cache-Control": "private, no-store", "Pragma": "no-cache"},
    )


@router.get("/evidences/{evidence_id}/download")
def download_evidence(
    evidence_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    tenant: Tenant,
    db: Db,
) -> Response:
    rate_limiter.check(
        client_key(request, "member-download", f"{tenant.organization_id}:{user.id}"),
        settings.download_rate_limit,
        settings.file_rate_window_seconds,
    )
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == tenant.organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Preuve introuvable")
    add_audit_event(
        db, request, "evidence.downloaded", "evidence", evidence.id, tenant.organization_id, user
    )
    db.commit()
    return _download_response(evidence)


@router.post("/evidences/{evidence_id}/download-url")
def create_evidence_download_url(
    evidence_id: uuid.UUID,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    tenant: Tenant,
    db: Db,
) -> dict[str, str | int]:
    rate_limiter.check(
        client_key(request, "member-download", f"{tenant.organization_id}:{user.id}"),
        settings.download_rate_limit,
        settings.file_rate_window_seconds,
    )
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == tenant.organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None or not evidence.object_key:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    token = create_download_token(evidence.id, tenant.organization_id)
    path = request.url_for("signed_download", token=token).path
    add_audit_event(
        db,
        request,
        "evidence.download_link_created",
        "evidence",
        evidence.id,
        tenant.organization_id,
        user,
    )
    db.commit()
    return {"url": path, "expiresIn": settings.signed_url_seconds}


@router.get("/downloads/{token}", name="signed_download")
def signed_download(token: str, request: Request, db: Db) -> Response:
    rate_limiter.check(
        client_key(request, "download-global"),
        settings.download_global_rate_limit,
        settings.file_rate_window_seconds,
    )
    evidence_id, organization_id = decode_download_token(token)
    rate_limiter.check(
        identity_key("signed-download", f"{organization_id}:{evidence_id}"),
        settings.download_rate_limit,
        settings.file_rate_window_seconds,
    )
    evidence = db.scalar(
        select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.organization_id == organization_id,
            Evidence.deleted_at.is_(None),
        )
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Téléchargement indisponible")
    return _download_response(evidence)
