from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.dependencies import (
    CurrentUser,
    Db,
    Tenant,
    TenantContext,
    require_min_role,
)
from app.models import (
    AnswerStatus,
    AuditEvent,
    ControlStatus,
    Evidence,
    OrganizationControl,
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireState,
    Role,
    ShareLink,
)
from app.schemas import AuditEventOut, DashboardOut, RecentActivityOut

router = APIRouter(tags=["Pilotage"])


def _audit_out(event: AuditEvent) -> AuditEventOut:
    return AuditEventOut(
        id=event.id,
        user_id=event.user_id,
        action=event.action,
        resource_type=event.resource_type,
        resource_id=event.resource_id,
        created_at=event.created_at,
        ip_address=event.ip_address,
        event_metadata=event.event_metadata,
    )


def _recent_out(event: AuditEvent) -> RecentActivityOut:
    return RecentActivityOut(
        action=event.action,
        resource_type=event.resource_type,
        created_at=event.created_at,
        event_metadata=event.event_metadata,
    )


@router.get("/audit-events", response_model=list[AuditEventOut])
def list_audit_events(
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ADMIN))],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[AuditEventOut]:
    events = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.organization_id == tenant.organization_id)
        .order_by(AuditEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_audit_out(event) for event in events]


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(_user: CurrentUser, tenant: Tenant, db: Db) -> DashboardOut:
    now = datetime.now(UTC)
    soon = now + timedelta(days=30)
    total_controls = (
        db.scalar(
            select(func.count(OrganizationControl.id)).where(
                OrganizationControl.organization_id == tenant.organization_id
            )
        )
        or 0
    )
    assessed_controls = (
        db.scalar(
            select(func.count(OrganizationControl.id)).where(
                OrganizationControl.organization_id == tenant.organization_id,
                OrganizationControl.status.notin_(
                    [ControlStatus.NOT_ASSESSED, ControlStatus.NOT_APPLICABLE]
                ),
            )
        )
        or 0
    )
    verified_controls = (
        db.scalar(
            select(func.count(OrganizationControl.id)).where(
                OrganizationControl.organization_id == tenant.organization_id,
                OrganizationControl.status == ControlStatus.VERIFIED,
            )
        )
        or 0
    )
    expired_evidences = (
        db.scalar(
            select(func.count(Evidence.id)).where(
                Evidence.organization_id == tenant.organization_id,
                Evidence.deleted_at.is_(None),
                Evidence.expires_at.is_not(None),
                Evidence.expires_at < now,
            )
        )
        or 0
    )
    expiring_evidences = (
        db.scalar(
            select(func.count(Evidence.id)).where(
                Evidence.organization_id == tenant.organization_id,
                Evidence.deleted_at.is_(None),
                Evidence.expires_at.is_not(None),
                Evidence.expires_at >= now,
                Evidence.expires_at <= soon,
            )
        )
        or 0
    )
    active_questionnaires = (
        db.scalar(
            select(func.count(Questionnaire.id)).where(
                Questionnaire.organization_id == tenant.organization_id,
                Questionnaire.deleted_at.is_(None),
                Questionnaire.state.in_(
                    [
                        QuestionnaireState.IMPORTED,
                        QuestionnaireState.PROCESSING,
                        QuestionnaireState.READY,
                        QuestionnaireState.IN_REVIEW,
                    ]
                ),
            )
        )
        or 0
    )
    answers_requiring_review = (
        db.scalar(
            select(func.count(QuestionnaireQuestion.id)).where(
                QuestionnaireQuestion.organization_id == tenant.organization_id,
                QuestionnaireQuestion.answer_status.in_(
                    [
                        AnswerStatus.GENERATED,
                        AnswerStatus.NEEDS_INFORMATION,
                        AnswerStatus.MANUALLY_ANSWERED,
                    ]
                ),
            )
        )
        or 0
    )
    active_share_links = (
        db.scalar(
            select(func.count(ShareLink.id)).where(
                ShareLink.organization_id == tenant.organization_id,
                ShareLink.revoked_at.is_(None),
                ShareLink.expires_at > now,
            )
        )
        or 0
    )
    recent = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.organization_id == tenant.organization_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(10)
    ).all()
    return DashboardOut(
        assessed_controls=assessed_controls,
        verified_controls=verified_controls,
        total_controls=total_controls,
        completion_rate=round(
            (assessed_controls / total_controls * 100) if total_controls else 0.0, 1
        ),
        expired_evidences=expired_evidences,
        expiring_evidences=expiring_evidences,
        active_questionnaires=active_questionnaires,
        answers_requiring_review=answers_requiring_review,
        active_share_links=active_share_links,
        recent_activity=[_recent_out(event) for event in recent],
    )
