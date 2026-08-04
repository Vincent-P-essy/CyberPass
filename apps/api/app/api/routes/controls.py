import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.sql.selectable import Subquery

from app.api.dependencies import Csrf, CurrentUser, Db, Tenant, TenantContext, require_min_role
from app.models import (
    Control,
    ControlStatus,
    Evidence,
    EvidenceControlLink,
    Framework,
    OrganizationControl,
    Role,
)
from app.schemas import ControlOut, ControlUpdate, FrameworkOut
from app.services.audit import add_audit_event

router = APIRouter(tags=["Contrôles"])


def _evidence_count_subquery(organization_id: uuid.UUID) -> Subquery:
    return (
        select(
            EvidenceControlLink.control_id,
            func.count(EvidenceControlLink.id).label("evidence_count"),
        )
        .join(Evidence, Evidence.id == EvidenceControlLink.evidence_id)
        .where(
            EvidenceControlLink.organization_id == organization_id,
            Evidence.organization_id == organization_id,
            Evidence.deleted_at.is_(None),
        )
        .group_by(EvidenceControlLink.control_id)
        .subquery()
    )


def _control_out(
    control: Control, state: OrganizationControl, evidence_count: int = 0
) -> ControlOut:
    return ControlOut(
        id=control.id,
        framework_id=control.framework_id,
        code=control.code,
        title=control.title,
        description=control.description,
        category=control.category,
        guidance=control.guidance,
        status=state.status,
        notes=state.notes,
        last_verified_at=state.last_verified_at,
        expires_at=state.expires_at,
        evidence_count=evidence_count,
    )


@router.get("/frameworks", response_model=list[FrameworkOut])
def list_frameworks(tenant: Tenant, db: Db) -> list[FrameworkOut]:
    frameworks = db.scalars(
        select(Framework)
        .where(
            (Framework.is_global.is_(True)) | (Framework.organization_id == tenant.organization_id)
        )
        .order_by(Framework.name)
    ).all()
    return [FrameworkOut.model_validate(item) for item in frameworks]


@router.get("/controls", response_model=list[ControlOut])
def list_controls(
    tenant: Tenant,
    db: Db,
    framework_id: uuid.UUID | None = Query(default=None, alias="frameworkId"),
    status_filter: ControlStatus | None = Query(default=None, alias="status"),
    category: str | None = None,
) -> list[ControlOut]:
    counts = _evidence_count_subquery(tenant.organization_id)
    query = (
        select(Control, OrganizationControl, func.coalesce(counts.c.evidence_count, 0))
        .join(
            OrganizationControl,
            (OrganizationControl.control_id == Control.id)
            & (OrganizationControl.organization_id == tenant.organization_id),
        )
        .outerjoin(counts, counts.c.control_id == Control.id)
        .order_by(Control.display_order, Control.code)
    )
    if framework_id:
        query = query.where(Control.framework_id == framework_id)
    if status_filter:
        query = query.where(OrganizationControl.status == status_filter)
    if category:
        query = query.where(func.lower(Control.category) == category.casefold())
    return [
        _control_out(control, state, count) for control, state, count in db.execute(query).all()
    ]


@router.get("/controls/{control_id}", response_model=ControlOut)
def get_control(control_id: uuid.UUID, tenant: Tenant, db: Db) -> ControlOut:
    counts = _evidence_count_subquery(tenant.organization_id)
    row = db.execute(
        select(Control, OrganizationControl, func.coalesce(counts.c.evidence_count, 0))
        .join(
            OrganizationControl,
            (OrganizationControl.control_id == Control.id)
            & (OrganizationControl.organization_id == tenant.organization_id),
        )
        .outerjoin(counts, counts.c.control_id == Control.id)
        .where(Control.id == control_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Contrôle introuvable")
    return _control_out(*row)


@router.patch("/controls/{control_id}", response_model=ControlOut)
def update_control(
    control_id: uuid.UUID,
    payload: ControlUpdate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: TenantContext = Depends(require_min_role(Role.ANALYST)),
) -> ControlOut:
    row = db.execute(
        select(Control, OrganizationControl)
        .join(
            OrganizationControl,
            (OrganizationControl.control_id == Control.id)
            & (OrganizationControl.organization_id == tenant.organization_id),
        )
        .where(Control.id == control_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Contrôle introuvable")
    control, state = row
    values = payload.model_dump(exclude_unset=True)
    if payload.status == ControlStatus.VERIFIED:
        evidence_exists = db.scalar(
            select(EvidenceControlLink.id)
            .join(Evidence, Evidence.id == EvidenceControlLink.evidence_id)
            .where(
                EvidenceControlLink.organization_id == tenant.organization_id,
                EvidenceControlLink.control_id == control.id,
                Evidence.organization_id == tenant.organization_id,
                Evidence.deleted_at.is_(None),
                or_(Evidence.expires_at.is_(None), Evidence.expires_at > datetime.now(UTC)),
            )
            .limit(1)
        )
        if evidence_exists is None:
            raise HTTPException(
                status_code=422, detail="Une preuve active est requise pour vérifier ce contrôle"
            )
    for key, value in values.items():
        setattr(state, key, value)
    if payload.status == ControlStatus.VERIFIED and payload.last_verified_at is None:
        state.last_verified_at = datetime.now(UTC)
    state.updated_by_id = user.id
    add_audit_event(
        db,
        request,
        "control.updated",
        "control",
        control.id,
        tenant.organization_id,
        user,
        {"status": str(state.status)},
    )
    db.commit()
    count = db.scalar(
        select(func.count(EvidenceControlLink.id))
        .join(Evidence, Evidence.id == EvidenceControlLink.evidence_id)
        .where(
            EvidenceControlLink.organization_id == tenant.organization_id,
            EvidenceControlLink.control_id == control.id,
            Evidence.deleted_at.is_(None),
        )
    )
    return _control_out(control, state, count or 0)
