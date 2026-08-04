import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select

from app.api.dependencies import Csrf, CurrentUser, Db, Tenant, TenantContext, require_min_role
from app.core.config import get_settings
from app.core.security import client_key, hash_token, identity_key, rate_limiter
from app.models import (
    Confidentiality,
    Control,
    Evidence,
    EvidenceControlLink,
    Organization,
    OrganizationControl,
    Role,
    ShareLink,
    ShareLinkControl,
    ShareLinkEvidence,
)
from app.schemas import (
    PublicControl,
    PublicEvidenceSummary,
    PublicPassport,
    ShareCreate,
    ShareCreated,
    ShareLinkOut,
)
from app.services.audit import add_audit_event

router = APIRouter(tags=["Passeports"])
settings = get_settings()
PUBLIC_CONFIDENTIALITIES = (Confidentiality.PUBLIC, Confidentiality.SHARED_SUMMARY)
DISCLAIMER = (
    "CyberPass centralise des déclarations et des preuves partagées par l'organisation. "
    "Ce passeport ne constitue ni une certification, ni une garantie de conformité juridique."
)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _share_out(db: Db, share: ShareLink) -> ShareLinkOut:
    control_ids = db.scalars(
        select(ShareLinkControl.control_id).where(
            ShareLinkControl.organization_id == share.organization_id,
            ShareLinkControl.share_link_id == share.id,
        )
    ).all()
    evidence_ids = db.scalars(
        select(ShareLinkEvidence.evidence_id).where(
            ShareLinkEvidence.organization_id == share.organization_id,
            ShareLinkEvidence.share_link_id == share.id,
        )
    ).all()
    return ShareLinkOut(
        id=share.id,
        title=share.title,
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
        control_ids=list(control_ids),
        evidence_ids=list(evidence_ids),
        access_count=share.access_count,
        created_at=share.created_at,
    )


@router.get("/share-links", response_model=list[ShareLinkOut])
def list_share_links(
    tenant: Tenant,
    db: Db,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ShareLinkOut]:
    shares = db.scalars(
        select(ShareLink)
        .where(ShareLink.organization_id == tenant.organization_id)
        .order_by(ShareLink.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_share_out(db, item) for item in shares]


@router.post("/share-links", response_model=ShareCreated, status_code=status.HTTP_201_CREATED)
def create_share_link(
    payload: ShareCreate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ADMIN))],
) -> ShareCreated:
    if payload.expires_at.tzinfo is None:
        raise HTTPException(status_code=422, detail="expiresAt doit inclure un fuseau horaire")
    expires_at = payload.expires_at.astimezone(UTC)
    now = datetime.now(UTC)
    if expires_at <= now:
        raise HTTPException(status_code=422, detail="La date d'expiration doit être future")
    if expires_at > now + timedelta(days=365):
        raise HTTPException(
            status_code=422, detail="La durée de partage ne peut pas dépasser un an"
        )
    requested_controls = set(payload.control_ids)
    available_controls = set(
        db.scalars(
            select(OrganizationControl.control_id).where(
                OrganizationControl.organization_id == tenant.organization_id,
                OrganizationControl.control_id.in_(requested_controls),
            )
        ).all()
    )
    if available_controls != requested_controls:
        raise HTTPException(status_code=422, detail="Un ou plusieurs contrôles sont indisponibles")
    requested_evidences = set(payload.evidence_ids)
    if requested_evidences:
        allowed_evidences = set(
            db.scalars(
                select(Evidence.id).where(
                    Evidence.organization_id == tenant.organization_id,
                    Evidence.id.in_(requested_evidences),
                    Evidence.deleted_at.is_(None),
                    Evidence.confidentiality.in_(PUBLIC_CONFIDENTIALITIES),
                )
            ).all()
        )
        if allowed_evidences != requested_evidences:
            raise HTTPException(
                status_code=422,
                detail="Une preuve est indisponible ou ne peut pas être partagée",
            )
        linked_pairs = db.execute(
            select(EvidenceControlLink.evidence_id, EvidenceControlLink.control_id).where(
                EvidenceControlLink.organization_id == tenant.organization_id,
                EvidenceControlLink.evidence_id.in_(requested_evidences),
                EvidenceControlLink.control_id.in_(requested_controls),
            )
        ).all()
        linked_evidences = {evidence_id for evidence_id, _control_id in linked_pairs}
        if linked_evidences != requested_evidences:
            raise HTTPException(
                status_code=422,
                detail="Chaque preuve partagée doit être liée à un contrôle partagé",
            )
    token = secrets.token_urlsafe(48)
    share = ShareLink(
        organization_id=tenant.organization_id,
        title=payload.title.strip(),
        token_hash=hash_token(token),
        expires_at=expires_at,
        created_by_id=user.id,
    )
    db.add(share)
    db.flush()
    db.add_all(
        ShareLinkControl(
            organization_id=tenant.organization_id,
            share_link_id=share.id,
            control_id=control_id,
        )
        for control_id in requested_controls
    )
    db.add_all(
        ShareLinkEvidence(
            organization_id=tenant.organization_id,
            share_link_id=share.id,
            evidence_id=evidence_id,
        )
        for evidence_id in requested_evidences
    )
    add_audit_event(
        db,
        request,
        "passport.created",
        "share_link",
        share.id,
        tenant.organization_id,
        user,
        {"controlCount": len(requested_controls), "evidenceCount": len(requested_evidences)},
    )
    db.commit()
    base = _share_out(db, share)
    return ShareCreated(
        **base.model_dump(), token=token, public_path=f"/api/v1/public/passports/{token}"
    )


@router.post("/share-links/{share_id}/revoke", response_model=ShareLinkOut)
def revoke_share_link(
    share_id: uuid.UUID,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ADMIN))],
) -> ShareLinkOut:
    share = db.scalar(
        select(ShareLink).where(
            ShareLink.id == share_id,
            ShareLink.organization_id == tenant.organization_id,
        )
    )
    if share is None:
        raise HTTPException(status_code=404, detail="Lien de partage introuvable")
    if share.revoked_at is None:
        share.revoked_at = datetime.now(UTC)
        add_audit_event(
            db,
            request,
            "passport.revoked",
            "share_link",
            share.id,
            tenant.organization_id,
            user,
        )
        db.commit()
    return _share_out(db, share)


@router.get("/public/passports/{token}", response_model=PublicPassport)
def public_passport(token: str, request: Request, response: Response, db: Db) -> PublicPassport:
    rate_limiter.check(
        client_key(request, "public-passport-global"),
        settings.public_share_global_rate_limit,
        settings.public_share_rate_window_seconds,
    )
    if len(token) < 48 or len(token) > 200:
        raise HTTPException(status_code=404, detail="Passeport introuvable ou indisponible")
    rate_limiter.check(
        identity_key("public-passport-token", token),
        settings.public_share_rate_limit,
        settings.public_share_rate_window_seconds,
    )
    share = db.scalar(select(ShareLink).where(ShareLink.token_hash == hash_token(token)))
    now = datetime.now(UTC)
    if share is None or share.revoked_at is not None or _aware(share.expires_at) <= now:
        raise HTTPException(status_code=404, detail="Passeport introuvable ou indisponible")
    organization = db.scalar(
        select(Organization).where(
            Organization.id == share.organization_id, Organization.deleted_at.is_(None)
        )
    )
    if organization is None:
        raise HTTPException(status_code=404, detail="Passeport introuvable ou indisponible")
    allowed_control_ids = db.scalars(
        select(ShareLinkControl.control_id).where(
            ShareLinkControl.organization_id == share.organization_id,
            ShareLinkControl.share_link_id == share.id,
        )
    ).all()
    allowed_evidence_ids = set(
        db.scalars(
            select(ShareLinkEvidence.evidence_id).where(
                ShareLinkEvidence.organization_id == share.organization_id,
                ShareLinkEvidence.share_link_id == share.id,
            )
        ).all()
    )
    control_rows = db.execute(
        select(Control, OrganizationControl)
        .join(
            OrganizationControl,
            (OrganizationControl.control_id == Control.id)
            & (OrganizationControl.organization_id == share.organization_id),
        )
        .where(Control.id.in_(allowed_control_ids))
        .order_by(Control.display_order)
    ).all()
    public_controls: list[PublicControl] = []
    update_dates = [organization.updated_at, share.created_at]
    for control, control_state in control_rows:
        evidences: list[PublicEvidenceSummary] = []
        if allowed_evidence_ids:
            evidence_rows = db.scalars(
                select(Evidence)
                .join(
                    EvidenceControlLink,
                    (EvidenceControlLink.evidence_id == Evidence.id)
                    & (EvidenceControlLink.organization_id == share.organization_id),
                )
                .where(
                    Evidence.organization_id == share.organization_id,
                    Evidence.id.in_(allowed_evidence_ids),
                    EvidenceControlLink.control_id == control.id,
                    Evidence.deleted_at.is_(None),
                    Evidence.confidentiality.in_(PUBLIC_CONFIDENTIALITIES),
                )
                .order_by(Evidence.created_at.desc())
            ).all()
            for evidence in evidence_rows:
                summary = (
                    evidence.description
                    if evidence.confidentiality == Confidentiality.PUBLIC
                    else evidence.public_summary
                )
                evidences.append(
                    PublicEvidenceSummary(
                        title=(
                            evidence.title
                            if evidence.confidentiality == Confidentiality.PUBLIC
                            else "Résumé de preuve partagé"
                        ),
                        description=summary,
                        evidence_type=evidence.evidence_type,
                        collected_at=evidence.collected_at,
                        expires_at=evidence.expires_at,
                    )
                )
                update_dates.append(evidence.updated_at)
        public_controls.append(
            PublicControl(
                id=control.id,
                code=control.code,
                title=control.title,
                description=control.description,
                category=control.category,
                status=control_state.status,
                last_verified_at=control_state.last_verified_at,
                expires_at=control_state.expires_at,
                evidences=evidences,
            )
        )
        update_dates.append(control_state.updated_at)
    share.last_accessed_at = now
    share.access_count += 1
    add_audit_event(
        db,
        request,
        "passport.viewed",
        "share_link",
        share.id,
        share.organization_id,
        metadata={"controlCount": len(public_controls)},
    )
    db.commit()
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Referrer-Policy"] = "no-referrer"
    return PublicPassport(
        organization={"name": organization.name},
        last_updated_at=max(_aware(value) for value in update_dates),
        expires_at=share.expires_at,
        controls=public_controls,
        disclaimer=DISCLAIMER,
    )
