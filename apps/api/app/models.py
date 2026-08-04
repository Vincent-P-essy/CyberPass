import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    event,
)
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Role(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class ControlStatus(StrEnum):
    NOT_ASSESSED = "NOT_ASSESSED"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
    PARTIAL = "PARTIAL"
    IMPLEMENTED = "IMPLEMENTED"
    VERIFIED = "VERIFIED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class EvidenceType(StrEnum):
    DOCUMENT = "DOCUMENT"
    SCREENSHOT = "SCREENSHOT"
    API_CHECK = "API_CHECK"
    POLICY = "POLICY"
    CERTIFICATE = "CERTIFICATE"
    MANUAL_ATTESTATION = "MANUAL_ATTESTATION"
    LINK = "LINK"


class Confidentiality(StrEnum):
    PUBLIC = "PUBLIC"
    SHARED_SUMMARY = "SHARED_SUMMARY"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class QuestionnaireState(StrEnum):
    IMPORTED = "IMPORTED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"
    EXPORTED = "EXPORTED"
    FAILED = "FAILED"


class AnswerStatus(StrEnum):
    UNANSWERED = "UNANSWERED"
    GENERATED = "GENERATED"
    NEEDS_INFORMATION = "NEEDS_INFORMATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MANUALLY_ANSWERED = "MANUALLY_ANSWERED"


enum_options = {"native_enum": False, "validate_strings": True}


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Organization(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(180))
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class Membership(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[Role] = mapped_column(Enum(Role, **enum_options), default=Role.VIEWER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    organization: Mapped[Organization] = relationship()
    user: Mapped[User] = relationship()


class Invitation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "invitations"
    __table_args__ = (UniqueConstraint("organization_id", "email"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[Role] = mapped_column(Enum(Role, **enum_options))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invited_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))


class Framework(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "frameworks"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(180), index=True)
    version: Mapped[str] = mapped_column(String(80), default="1.0")
    description: Mapped[str | None] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class Control(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "controls"
    __table_args__ = (UniqueConstraint("framework_id", "code"),)

    framework_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("frameworks.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(120), index=True)
    guidance: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    framework: Mapped[Framework] = relationship()


class ControlMapping(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "control_mappings"
    __table_args__ = (UniqueConstraint("source_control_id", "target_control_id"),)

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    source_control_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("controls.id", ondelete="CASCADE"), index=True
    )
    target_control_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("controls.id", ondelete="CASCADE"), index=True
    )
    mapping_type: Mapped[str] = mapped_column(String(40), default="RELATED")


class OrganizationControl(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organization_controls"
    __table_args__ = (UniqueConstraint("organization_id", "control_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    control_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("controls.id", ondelete="CASCADE"))
    status: Mapped[ControlStatus] = mapped_column(
        Enum(ControlStatus, **enum_options), default=ControlStatus.NOT_ASSESSED, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    control: Mapped[Control] = relationship()


class Evidence(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "evidences"
    __table_args__ = (Index("ix_evidences_org_expiration", "organization_id", "expires_at"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text)
    public_summary: Mapped[str | None] = mapped_column(Text)
    evidence_type: Mapped[EvidenceType] = mapped_column(Enum(EvidenceType, **enum_options))
    confidentiality: Mapped[Confidentiality] = mapped_column(Enum(Confidentiality, **enum_options))
    source: Mapped[str | None] = mapped_column(String(500))
    object_key: Mapped[str | None] = mapped_column(String(600), unique=True)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(160))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class EvidenceVersion(UUIDMixin, Base):
    __tablename__ = "evidence_versions"
    __table_args__ = (UniqueConstraint("evidence_id", "version_number"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("evidences.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    object_key: Mapped[str | None] = mapped_column(String(600))
    original_filename: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(160))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    sha256: Mapped[str | None] = mapped_column(String(64))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EvidenceControlLink(UUIDMixin, Base):
    __tablename__ = "evidence_control_links"
    __table_args__ = (UniqueConstraint("organization_id", "evidence_id", "control_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("evidences.id", ondelete="CASCADE"), index=True
    )
    control_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("controls.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Questionnaire(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "questionnaires"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(240))
    original_filename: Mapped[str] = mapped_column(String(255))
    source_format: Mapped[str] = mapped_column(String(10))
    state: Mapped[QuestionnaireState] = mapped_column(
        Enum(QuestionnaireState, **enum_options), default=QuestionnaireState.IMPORTED, index=True
    )
    sheet_name: Mapped[str | None] = mapped_column(String(255))
    question_column: Mapped[str] = mapped_column(String(255))
    original_columns: Mapped[list[str]] = mapped_column(JSON, default=list)
    mapping: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    imported_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class QuestionnaireQuestion(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "questionnaire_questions"
    __table_args__ = (UniqueConstraint("questionnaire_id", "display_order"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questionnaires.id", ondelete="CASCADE"), index=True
    )
    display_order: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(Text)
    original_row: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    answer_status: Mapped[AnswerStatus] = mapped_column(
        Enum(AnswerStatus, **enum_options), default=AnswerStatus.UNANSWERED, index=True
    )


class SuggestedAnswer(UUIDMixin, Base):
    __tablename__ = "suggested_answers"
    __table_args__ = (Index("ix_answers_org_question", "organization_id", "question_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questionnaire_questions.id", ondelete="CASCADE"), index=True
    )
    proposed_answer: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    missing_information: Mapped[list[str]] = mapped_column(JSON, default=list)
    risk_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    control_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    requires_human_review: Mapped[bool] = mapped_column(Boolean, default=True)
    model_version: Mapped[str] = mapped_column(String(160))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    edited_answer: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AnswerEvidenceLink(UUIDMixin, Base):
    __tablename__ = "answer_evidence_links"
    __table_args__ = (UniqueConstraint("organization_id", "answer_id", "evidence_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    answer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suggested_answers.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("evidences.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ShareLink(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "share_links"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(240))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    access_count: Mapped[int] = mapped_column(Integer, default=0)


class ShareLinkControl(UUIDMixin, Base):
    __tablename__ = "share_link_controls"
    __table_args__ = (UniqueConstraint("share_link_id", "control_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    share_link_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("share_links.id", ondelete="CASCADE"), index=True
    )
    control_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("controls.id", ondelete="CASCADE"))


class ShareLinkEvidence(UUIDMixin, Base):
    __tablename__ = "share_link_evidences"
    __table_args__ = (UniqueConstraint("share_link_id", "evidence_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    share_link_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("share_links.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evidences.id", ondelete="CASCADE"))


class AuditEvent(UUIDMixin, Base):
    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_org_created", "organization_id", "created_at"),)

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class AiUsageEvent(UUIDMixin, Base):
    __tablename__ = "ai_usage_events"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    questionnaire_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("questionnaires.id", ondelete="SET NULL"), index=True
    )
    provider: Mapped[str] = mapped_column(String(80))
    model_version: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(20), default="SUCCESS")
    error_code: Mapped[str | None] = mapped_column(String(80))
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    estimated_cost: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


@event.listens_for(Session, "before_flush")
def prevent_audit_mutation(session: Session, _flush_context: object, _instances: object) -> None:
    if any(isinstance(item, AuditEvent) for item in session.dirty):
        raise ValueError("Le journal d'audit est immuable")
    if any(isinstance(item, AuditEvent) for item in session.deleted):
        raise ValueError("Le journal d'audit est immuable")
