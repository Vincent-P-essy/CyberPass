import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic.alias_generators import to_camel

from app.models import (
    AnswerStatus,
    Confidentiality,
    ControlStatus,
    EvidenceType,
    QuestionnaireState,
    Role,
)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        use_enum_values=True,
    )


class Message(ApiModel):
    message: str


class RegisterRequest(ApiModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Le mot de passe doit contenir une majuscule")
        if not any(char.islower() for char in value):
            raise ValueError("Le mot de passe doit contenir une minuscule")
        if not any(char.isdigit() for char in value):
            raise ValueError("Le mot de passe doit contenir un chiffre")
        return value


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserSummary(ApiModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str


class MembershipSummary(ApiModel):
    organization_id: uuid.UUID
    organization_name: str
    role: Role


class AuthResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int
    csrf_token: str
    user: UserSummary


class MeResponse(UserSummary):
    memberships: list[MembershipSummary] = Field(default_factory=list)


class OrganizationCreate(ApiModel):
    name: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)


class OrganizationUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)


class OrganizationOut(ApiModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    role: Role
    created_at: datetime


class InvitationCreate(ApiModel):
    email: EmailStr
    role: Role = Role.VIEWER


class InvitationOut(ApiModel):
    id: uuid.UUID
    email: EmailStr
    role: Role
    expires_at: datetime
    created_at: datetime


class MembershipRoleUpdate(ApiModel):
    role: Role


class FrameworkOut(ApiModel):
    id: uuid.UUID
    name: str
    version: str
    description: str | None
    is_demo: bool


class ControlOut(ApiModel):
    id: uuid.UUID
    framework_id: uuid.UUID
    code: str
    title: str
    description: str
    category: str
    guidance: str | None
    status: ControlStatus
    notes: str | None = None
    last_verified_at: datetime | None = None
    expires_at: datetime | None = None
    evidence_count: int = 0


class ControlUpdate(ApiModel):
    status: ControlStatus | None = None
    notes: str | None = Field(default=None, max_length=5000)
    last_verified_at: datetime | None = None
    expires_at: datetime | None = None

    @field_validator("last_verified_at", "expires_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("La date doit inclure un fuseau horaire")
        return value


class EvidenceOut(ApiModel):
    id: uuid.UUID
    title: str
    description: str | None
    public_summary: str | None
    evidence_type: EvidenceType
    confidentiality: Confidentiality
    source: str | None
    original_filename: str | None
    mime_type: str | None
    size_bytes: int | None
    collected_at: datetime
    expires_at: datetime | None
    sha256: str | None
    control_ids: list[uuid.UUID] = Field(default_factory=list)
    has_file: bool
    created_at: datetime
    updated_at: datetime


class EvidenceUpdate(ApiModel):
    title: str | None = Field(default=None, min_length=2, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    public_summary: str | None = Field(default=None, max_length=1000)
    confidentiality: Confidentiality | None = None
    source: str | None = Field(default=None, max_length=500)
    expires_at: datetime | None = None
    control_ids: list[uuid.UUID] | None = None

    @field_validator("expires_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("La date doit inclure un fuseau horaire")
        return value


class QuestionnairePreview(ApiModel):
    filename: str
    source_format: str
    sheet_names: list[str]
    selected_sheet: str | None
    columns: list[str]
    suggested_question_column: str
    rows: list[dict[str, Any]]
    detected_question_count: int


class SuggestedAnswerOut(ApiModel):
    id: uuid.UUID
    proposed_answer: str
    edited_answer: str | None
    confidence: float
    evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    control_ids: list[uuid.UUID] = Field(default_factory=list)
    missing_information: list[str]
    risk_flags: list[str]
    requires_human_review: bool
    model_version: str
    generated_at: datetime
    approved_at: datetime | None


class QuestionnaireQuestionOut(ApiModel):
    id: uuid.UUID
    display_order: int
    question_text: str
    original_row: dict[str, Any]
    answer_status: AnswerStatus
    answer: SuggestedAnswerOut | None = None


class QuestionnaireOut(ApiModel):
    id: uuid.UUID
    name: str
    original_filename: str
    source_format: str
    state: QuestionnaireState
    sheet_name: str | None
    question_column: str
    original_columns: list[str]
    question_count: int = 0
    created_at: datetime
    updated_at: datetime


class QuestionnaireDetail(QuestionnaireOut):
    questions: list[QuestionnaireQuestionOut]


class GenerateRequest(ApiModel):
    question_ids: list[uuid.UUID] | None = Field(default=None, min_length=1, max_length=25)
    allow_external_provider: bool = False


class AnswerUpdate(ApiModel):
    answer: str = Field(min_length=1, max_length=20000)


class AnswerApproval(ApiModel):
    answer: str | None = Field(default=None, min_length=1, max_length=20000)


class ShareCreate(ApiModel):
    title: str = Field(min_length=2, max_length=240)
    expires_at: datetime
    control_ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    evidence_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)


class ShareLinkOut(ApiModel):
    id: uuid.UUID
    title: str
    expires_at: datetime
    revoked_at: datetime | None
    control_ids: list[uuid.UUID]
    evidence_ids: list[uuid.UUID]
    access_count: int
    created_at: datetime


class ShareCreated(ShareLinkOut):
    token: str
    public_path: str


class PublicEvidenceSummary(ApiModel):
    title: str
    description: str | None
    evidence_type: EvidenceType
    collected_at: datetime
    expires_at: datetime | None


class PublicControl(ApiModel):
    id: uuid.UUID
    code: str
    title: str
    description: str
    category: str
    status: ControlStatus
    last_verified_at: datetime | None
    expires_at: datetime | None
    evidences: list[PublicEvidenceSummary]


class PublicPassport(ApiModel):
    organization: dict[str, str]
    last_updated_at: datetime
    expires_at: datetime
    controls: list[PublicControl]
    disclaimer: str


class AuditEventOut(ApiModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    created_at: datetime
    ip_address: str | None
    event_metadata: dict[str, Any]


class RecentActivityOut(ApiModel):
    action: str
    resource_type: str
    created_at: datetime
    event_metadata: dict[str, Any]


class DashboardOut(ApiModel):
    assessed_controls: int
    verified_controls: int
    total_controls: int
    completion_rate: float
    expired_evidences: int
    expiring_evidences: int
    active_questionnaires: int
    answers_requiring_review: int
    active_share_links: int
    recent_activity: list[RecentActivityOut]
