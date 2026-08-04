import csv
import io
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any

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
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func, select

from app.api.dependencies import Csrf, CurrentUser, Db, Tenant, TenantContext, require_min_role
from app.core.config import get_settings
from app.core.security import client_key, rate_limiter
from app.models import (
    AiUsageEvent,
    AnswerEvidenceLink,
    AnswerStatus,
    Confidentiality,
    Control,
    Evidence,
    EvidenceControlLink,
    OrganizationControl,
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireState,
    Role,
    SuggestedAnswer,
)
from app.schemas import (
    AnswerApproval,
    AnswerUpdate,
    GenerateRequest,
    QuestionnaireDetail,
    QuestionnaireOut,
    QuestionnairePreview,
    QuestionnaireQuestionOut,
    SuggestedAnswerOut,
)
from app.services.ai import (
    ControlSnippet,
    EvidenceSnippet,
    GenerationResult,
    build_ai_provider,
    generation_concurrency_limiter,
)
from app.services.audit import add_audit_event
from app.services.questionnaires import ParsedSheet, QuestionnaireParseError, parse_questionnaire
from app.services.storage import sanitize_filename

router = APIRouter(tags=["Questionnaires"])
settings = get_settings()
MAX_GENERATION_BATCH = 25


async def _read_questionnaire(upload: UploadFile) -> bytes:
    content = await upload.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux")
    if not content:
        raise HTTPException(status_code=422, detail="Le fichier est vide")
    return content


def _parse(
    upload: UploadFile, content: bytes, sheet_name: str | None = None
) -> tuple[str, ParsedSheet]:
    filename = sanitize_filename(upload.filename or "questionnaire")
    try:
        return filename, parse_questionnaire(filename, content, sheet_name)
    except QuestionnaireParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _latest_answer(
    db: Db, organization_id: uuid.UUID, question_id: uuid.UUID
) -> SuggestedAnswer | None:
    return db.scalar(
        select(SuggestedAnswer)
        .where(
            SuggestedAnswer.organization_id == organization_id,
            SuggestedAnswer.question_id == question_id,
        )
        .order_by(SuggestedAnswer.generated_at.desc(), SuggestedAnswer.id.desc())
        .limit(1)
    )


def _answer_out(db: Db, answer: SuggestedAnswer) -> SuggestedAnswerOut:
    evidence_ids = db.scalars(
        select(AnswerEvidenceLink.evidence_id).where(
            AnswerEvidenceLink.organization_id == answer.organization_id,
            AnswerEvidenceLink.answer_id == answer.id,
        )
    ).all()
    return SuggestedAnswerOut(
        id=answer.id,
        proposed_answer=answer.proposed_answer,
        edited_answer=answer.edited_answer,
        confidence=answer.confidence,
        evidence_ids=list(evidence_ids),
        control_ids=[uuid.UUID(value) for value in answer.control_ids],
        missing_information=answer.missing_information,
        risk_flags=answer.risk_flags,
        requires_human_review=answer.requires_human_review,
        model_version=answer.model_version,
        generated_at=answer.generated_at,
        approved_at=answer.approved_at,
    )


def _question_out(db: Db, question: QuestionnaireQuestion) -> QuestionnaireQuestionOut:
    answer = _latest_answer(db, question.organization_id, question.id)
    return QuestionnaireQuestionOut(
        id=question.id,
        display_order=question.display_order,
        question_text=question.question_text,
        original_row=question.original_row,
        answer_status=question.answer_status,
        answer=_answer_out(db, answer) if answer else None,
    )


def _questionnaire_out(db: Db, questionnaire: Questionnaire) -> QuestionnaireOut:
    count = db.scalar(
        select(func.count(QuestionnaireQuestion.id)).where(
            QuestionnaireQuestion.organization_id == questionnaire.organization_id,
            QuestionnaireQuestion.questionnaire_id == questionnaire.id,
        )
    )
    return QuestionnaireOut(
        id=questionnaire.id,
        name=questionnaire.name,
        original_filename=questionnaire.original_filename,
        source_format=questionnaire.source_format,
        state=questionnaire.state,
        sheet_name=questionnaire.sheet_name,
        question_column=questionnaire.question_column,
        original_columns=questionnaire.original_columns,
        question_count=count or 0,
        created_at=questionnaire.created_at,
        updated_at=questionnaire.updated_at,
    )


def _get_questionnaire(
    db: Db, organization_id: uuid.UUID, questionnaire_id: uuid.UUID
) -> Questionnaire:
    questionnaire = db.scalar(
        select(Questionnaire).where(
            Questionnaire.id == questionnaire_id,
            Questionnaire.organization_id == organization_id,
            Questionnaire.deleted_at.is_(None),
        )
    )
    if questionnaire is None:
        raise HTTPException(status_code=404, detail="Questionnaire introuvable")
    return questionnaire


@router.post("/questionnaires/preview", response_model=QuestionnairePreview)
async def preview_questionnaire(
    request: Request,
    _csrf: Csrf,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
    file: Annotated[UploadFile, File()],
    sheet_name: Annotated[str | None, Form(alias="sheetName")] = None,
) -> QuestionnairePreview:
    rate_limiter.check(
        client_key(
            request,
            "file-operation",
            f"{tenant.organization_id}:{tenant.membership.user_id}",
        ),
        settings.upload_rate_limit,
        settings.file_rate_window_seconds,
    )
    content = await _read_questionnaire(file)
    filename, parsed = _parse(file, content, sheet_name)
    return QuestionnairePreview(
        filename=filename,
        source_format=parsed.source_format,
        sheet_names=parsed.sheet_names,
        selected_sheet=parsed.selected_sheet,
        columns=parsed.columns,
        suggested_question_column=parsed.suggested_question_column,
        rows=parsed.rows[:20],
        detected_question_count=len(parsed.questions()),
    )


@router.post(
    "/questionnaires/import", response_model=QuestionnaireOut, status_code=status.HTTP_201_CREATED
)
async def import_questionnaire(
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
    file: Annotated[UploadFile, File()],
    name: Annotated[str | None, Form(max_length=240)] = None,
    sheet_name: Annotated[str | None, Form(alias="sheetName")] = None,
    question_column: Annotated[str | None, Form(alias="questionColumn")] = None,
) -> QuestionnaireOut:
    rate_limiter.check(
        client_key(request, "file-operation", f"{tenant.organization_id}:{user.id}"),
        settings.upload_rate_limit,
        settings.file_rate_window_seconds,
    )
    questionnaire_count = (
        db.scalar(
            select(func.count(Questionnaire.id)).where(
                Questionnaire.organization_id == tenant.organization_id
            )
        )
        or 0
    )
    if questionnaire_count >= settings.tenant_questionnaire_quota:
        raise HTTPException(
            status_code=409, detail="Quota de questionnaires atteint pour l'organisation"
        )
    content = await _read_questionnaire(file)
    filename, parsed = _parse(file, content, sheet_name)
    selected_column = question_column or parsed.suggested_question_column
    try:
        questions = parsed.questions(selected_column)
    except QuestionnaireParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    questionnaire = Questionnaire(
        organization_id=tenant.organization_id,
        name=(name or Path(filename).stem).strip()[:240],
        original_filename=filename,
        source_format=parsed.source_format,
        state=QuestionnaireState.READY,
        sheet_name=parsed.selected_sheet,
        question_column=selected_column,
        original_columns=parsed.columns,
        mapping={"questionColumn": selected_column, "sheetName": parsed.selected_sheet},
        imported_by_id=user.id,
    )
    db.add(questionnaire)
    db.flush()
    db.add_all(
        QuestionnaireQuestion(
            organization_id=tenant.organization_id,
            questionnaire_id=questionnaire.id,
            display_order=order,
            question_text=text,
            original_row=row,
        )
        for order, (_source_row, text, row) in enumerate(questions, start=1)
    )
    add_audit_event(
        db,
        request,
        "questionnaire.imported",
        "questionnaire",
        questionnaire.id,
        tenant.organization_id,
        user,
        {"format": parsed.source_format, "questionCount": len(questions)},
    )
    db.commit()
    return _questionnaire_out(db, questionnaire)


@router.get("/questionnaires", response_model=list[QuestionnaireOut])
def list_questionnaires(
    tenant: Tenant,
    db: Db,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[QuestionnaireOut]:
    questionnaires = db.scalars(
        select(Questionnaire)
        .where(
            Questionnaire.organization_id == tenant.organization_id,
            Questionnaire.deleted_at.is_(None),
        )
        .order_by(Questionnaire.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_questionnaire_out(db, item) for item in questionnaires]


@router.get("/questionnaires/{questionnaire_id}", response_model=QuestionnaireDetail)
def get_questionnaire(questionnaire_id: uuid.UUID, tenant: Tenant, db: Db) -> QuestionnaireDetail:
    questionnaire = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    questions = db.scalars(
        select(QuestionnaireQuestion)
        .where(
            QuestionnaireQuestion.organization_id == tenant.organization_id,
            QuestionnaireQuestion.questionnaire_id == questionnaire.id,
        )
        .order_by(QuestionnaireQuestion.display_order)
    ).all()
    base = _questionnaire_out(db, questionnaire)
    return QuestionnaireDetail(
        **base.model_dump(), questions=[_question_out(db, item) for item in questions]
    )


def _generation_context(
    db: Db, organization_id: uuid.UUID, allow_external_provider: bool
) -> tuple[list[ControlSnippet], list[EvidenceSnippet]]:
    control_rows = db.execute(
        select(Control, OrganizationControl)
        .join(
            OrganizationControl,
            (OrganizationControl.control_id == Control.id)
            & (OrganizationControl.organization_id == organization_id),
        )
        .order_by(Control.display_order)
    ).all()
    controls = [
        ControlSnippet(
            id=control.id,
            code=control.code,
            title=control.title,
            description=control.description,
            status=state.status.value,
        )
        for control, state in control_rows
    ]
    evidence_query = select(Evidence).where(
        Evidence.organization_id == organization_id,
        Evidence.deleted_at.is_(None),
    )
    if allow_external_provider:
        evidence_query = evidence_query.where(
            Evidence.confidentiality.in_([Confidentiality.PUBLIC, Confidentiality.SHARED_SUMMARY])
        )
    evidences = []
    for evidence in db.scalars(evidence_query.order_by(Evidence.created_at.desc())).all():
        linked_control_ids = db.scalars(
            select(EvidenceControlLink.control_id).where(
                EvidenceControlLink.organization_id == organization_id,
                EvidenceControlLink.evidence_id == evidence.id,
            )
        ).all()
        evidences.append(
            EvidenceSnippet(
                id=evidence.id,
                title=evidence.title,
                description=evidence.description or "Aucune description disponible",
                control_ids=list(linked_control_ids),
                source=evidence.source,
                public_summary=evidence.public_summary,
                confidentiality=evidence.confidentiality.value,
                collected_at=evidence.collected_at,
                expires_at=evidence.expires_at,
            )
        )
    return controls, evidences


def _add_ai_usage(
    db: Db,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    questionnaire_id: uuid.UUID,
    result: GenerationResult,
    *,
    status_value: str = "SUCCESS",
    error_code: str | None = None,
) -> None:
    db.add(
        AiUsageEvent(
            organization_id=organization_id,
            user_id=user_id,
            questionnaire_id=questionnaire_id,
            provider=result.provider,
            model_version=result.model_version,
            status=status_value,
            error_code=error_code,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            estimated_cost=result.estimated_cost,
        )
    )


@router.post("/questionnaires/{questionnaire_id}/generate", response_model=QuestionnaireDetail)
def generate_answers(
    questionnaire_id: uuid.UUID,
    payload: GenerateRequest,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
) -> QuestionnaireDetail:
    questionnaire = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    rate_limiter.check(
        client_key(request, "answer-generation", f"{tenant.organization_id}:{user.id}"),
        settings.generation_rate_limit,
        settings.generation_rate_window_seconds,
    )
    query = select(QuestionnaireQuestion).where(
        QuestionnaireQuestion.organization_id == tenant.organization_id,
        QuestionnaireQuestion.questionnaire_id == questionnaire.id,
    )
    if payload.question_ids:
        query = query.where(QuestionnaireQuestion.id.in_(payload.question_ids))
    questions = db.scalars(
        query.order_by(QuestionnaireQuestion.display_order).limit(MAX_GENERATION_BATCH + 1)
    ).all()
    if len(questions) > MAX_GENERATION_BATCH:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Une génération traite au maximum {MAX_GENERATION_BATCH} questions; "
                "sélectionnez explicitement questionIds"
            ),
        )
    if payload.question_ids and len(questions) != len(set(payload.question_ids)):
        raise HTTPException(status_code=404, detail="Une question est introuvable")
    if not questions:
        raise HTTPException(status_code=422, detail="Aucune question à traiter")
    controls, evidences = _generation_context(
        db, tenant.organization_id, payload.allow_external_provider
    )
    provider = build_ai_provider(payload.allow_external_provider)
    concurrency_key = str(tenant.organization_id)
    if not generation_concurrency_limiter.acquire(
        concurrency_key, settings.generation_concurrency_per_tenant
    ):
        raise HTTPException(
            status_code=409,
            detail="Une génération est déjà en cours pour cette organisation",
        )
    completed_usage: list[GenerationResult] = []
    try:
        for question in questions:
            try:
                result = provider.generate(question.question_text, controls, evidences)
            except Exception as exc:
                db.rollback()
                failed = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
                failed.state = QuestionnaireState.FAILED
                for completed in completed_usage:
                    _add_ai_usage(
                        db,
                        tenant.organization_id,
                        user.id,
                        failed.id,
                        completed,
                    )
                _add_ai_usage(
                    db,
                    tenant.organization_id,
                    user.id,
                    failed.id,
                    GenerationResult(
                        proposed_answer="",
                        confidence=0.0,
                        provider=provider.provider_name,
                        model_version=provider.model_version,
                    ),
                    status_value="FAILED",
                    error_code="PROVIDER_ERROR",
                )
                add_audit_event(
                    db,
                    request,
                    "questionnaire.generation_failed",
                    "questionnaire",
                    failed.id,
                    tenant.organization_id,
                    user,
                    {
                        "externalProvider": payload.allow_external_provider,
                        "completedCalls": len(completed_usage),
                    },
                )
                db.commit()
                raise HTTPException(
                    status_code=502, detail="La génération de réponse a échoué"
                ) from exc
            completed_usage.append(result)
            answer = SuggestedAnswer(
                organization_id=tenant.organization_id,
                question_id=question.id,
                proposed_answer=result.proposed_answer,
                confidence=result.confidence,
                missing_information=result.missing_information,
                risk_flags=result.risk_flags,
                control_ids=[str(control_id) for control_id in result.control_ids],
                requires_human_review=True,
                model_version=result.model_version,
            )
            db.add(answer)
            db.flush()
            db.add_all(
                AnswerEvidenceLink(
                    organization_id=tenant.organization_id,
                    answer_id=answer.id,
                    evidence_id=evidence_id,
                )
                for evidence_id in result.evidence_ids
            )
            question.answer_status = (
                AnswerStatus.NEEDS_INFORMATION
                if result.missing_information
                else AnswerStatus.GENERATED
            )
            _add_ai_usage(db, tenant.organization_id, user.id, questionnaire.id, result)
        questionnaire.state = QuestionnaireState.IN_REVIEW
        add_audit_event(
            db,
            request,
            "questionnaire.answers_generated",
            "questionnaire",
            questionnaire.id,
            tenant.organization_id,
            user,
            {
                "questionCount": len(questions),
                "externalProvider": payload.allow_external_provider,
            },
        )
        db.commit()
    finally:
        generation_concurrency_limiter.release(concurrency_key)
    return get_questionnaire(questionnaire.id, tenant, db)


def _get_question(
    db: Db, organization_id: uuid.UUID, questionnaire_id: uuid.UUID, question_id: uuid.UUID
) -> QuestionnaireQuestion:
    question = db.scalar(
        select(QuestionnaireQuestion).where(
            QuestionnaireQuestion.id == question_id,
            QuestionnaireQuestion.questionnaire_id == questionnaire_id,
            QuestionnaireQuestion.organization_id == organization_id,
        )
    )
    if question is None:
        raise HTTPException(status_code=404, detail="Question introuvable")
    return question


@router.patch(
    "/questionnaires/{questionnaire_id}/questions/{question_id}/answer",
    response_model=QuestionnaireQuestionOut,
)
def edit_answer(
    questionnaire_id: uuid.UUID,
    question_id: uuid.UUID,
    payload: AnswerUpdate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
) -> QuestionnaireQuestionOut:
    _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    question = _get_question(db, tenant.organization_id, questionnaire_id, question_id)
    answer = _latest_answer(db, tenant.organization_id, question.id)
    if answer is None:
        answer = SuggestedAnswer(
            organization_id=tenant.organization_id,
            question_id=question.id,
            proposed_answer=payload.answer.strip(),
            edited_answer=payload.answer.strip(),
            confidence=1.0,
            missing_information=[],
            risk_flags=[],
            control_ids=[],
            requires_human_review=True,
            model_version="manual",
        )
        db.add(answer)
    else:
        answer.edited_answer = payload.answer.strip()
        answer.approved_at = None
        answer.approved_by_id = None
    question.answer_status = AnswerStatus.MANUALLY_ANSWERED
    add_audit_event(
        db,
        request,
        "questionnaire.answer_edited",
        "question",
        question.id,
        tenant.organization_id,
        user,
    )
    db.commit()
    return _question_out(db, question)


@router.post(
    "/questionnaires/{questionnaire_id}/questions/{question_id}/approve",
    response_model=QuestionnaireQuestionOut,
)
def approve_answer(
    questionnaire_id: uuid.UUID,
    question_id: uuid.UUID,
    payload: AnswerApproval,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: Annotated[TenantContext, Depends(require_min_role(Role.ANALYST))],
) -> QuestionnaireQuestionOut:
    questionnaire = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    question = _get_question(db, tenant.organization_id, questionnaire_id, question_id)
    answer = _latest_answer(db, tenant.organization_id, question.id)
    if answer is None:
        raise HTTPException(
            status_code=409, detail="Ajoutez ou générez une réponse avant approbation"
        )
    if payload.answer:
        answer.edited_answer = payload.answer.strip()
    answer.approved_at = datetime.now(UTC)
    answer.approved_by_id = user.id
    question.answer_status = AnswerStatus.APPROVED
    unapproved = db.scalar(
        select(func.count(QuestionnaireQuestion.id)).where(
            QuestionnaireQuestion.organization_id == tenant.organization_id,
            QuestionnaireQuestion.questionnaire_id == questionnaire.id,
            QuestionnaireQuestion.id != question.id,
            QuestionnaireQuestion.answer_status != AnswerStatus.APPROVED,
        )
    )
    if not unapproved:
        questionnaire.state = QuestionnaireState.COMPLETED
    add_audit_event(
        db,
        request,
        "questionnaire.answer_approved",
        "question",
        question.id,
        tenant.organization_id,
        user,
    )
    db.commit()
    return _question_out(db, question)


def _export_rows(db: Db, questionnaire: Questionnaire) -> list[dict[str, Any]]:
    questions = db.scalars(
        select(QuestionnaireQuestion)
        .where(
            QuestionnaireQuestion.organization_id == questionnaire.organization_id,
            QuestionnaireQuestion.questionnaire_id == questionnaire.id,
        )
        .order_by(QuestionnaireQuestion.display_order)
    ).all()
    rows = []
    for question in questions:
        answer = _latest_answer(db, questionnaire.organization_id, question.id)
        evidence_ids: list[uuid.UUID] = []
        if answer:
            evidence_ids = list(
                db.scalars(
                    select(AnswerEvidenceLink.evidence_id).where(
                        AnswerEvidenceLink.organization_id == questionnaire.organization_id,
                        AnswerEvidenceLink.answer_id == answer.id,
                    )
                ).all()
            )
        rows.append(
            {
                "Ordre": question.display_order,
                "Question": question.question_text,
                "Réponse": (answer.edited_answer or answer.proposed_answer) if answer else "",
                "Statut": question.answer_status.value,
                "Preuves": ", ".join(str(item) for item in evidence_ids),
            }
        )
    return rows


def _safe_spreadsheet_cell(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    stripped = value.lstrip()
    if stripped.startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def _build_export_response(
    db: Db, questionnaire: Questionnaire, export_format: str
) -> StreamingResponse:
    rows = _export_rows(db, questionnaire)
    safe_base = sanitize_filename(questionnaire.name).rsplit(".", maxsplit=1)[0]
    if export_format == "csv":
        stream = io.StringIO()
        writer = csv.DictWriter(
            stream, fieldnames=["Ordre", "Question", "Réponse", "Statut", "Preuves"]
        )
        writer.writeheader()
        writer.writerows(
            [{key: _safe_spreadsheet_cell(value) for key, value in row.items()} for row in rows]
        )
        content = io.BytesIO(stream.getvalue().encode("utf-8-sig"))
        media_type = "text/csv; charset=utf-8"
    else:
        workbook = Workbook()
        workbook.properties.creator = "Plessy Vincent"
        workbook.properties.lastModifiedBy = "Plessy Vincent"
        sheet = workbook.active
        sheet.title = "Réponses"
        sheet.append(["Ordre", "Question", "Réponse", "Statut", "Preuves"])
        for row in rows:
            sheet.append(
                [
                    _safe_spreadsheet_cell(row[column])
                    for column in ["Ordre", "Question", "Réponse", "Statut", "Preuves"]
                ]
            )
        content = io.BytesIO()
        workbook.save(content)
        content.seek(0)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return StreamingResponse(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_base}.{export_format}"',
            "Cache-Control": "private, no-store",
            "Pragma": "no-cache",
        },
    )


@router.get("/questionnaires/{questionnaire_id}/export")
def export_questionnaire(
    questionnaire_id: uuid.UUID,
    request: Request,
    tenant: Tenant,
    db: Db,
    export_format: str = Query(default="xlsx", alias="format", pattern="^(csv|xlsx)$"),
) -> StreamingResponse:
    """Exporte sans modifier l'état: GET reste strictement en lecture."""
    rate_limiter.check(
        client_key(
            request,
            "member-download",
            f"{tenant.organization_id}:{tenant.membership.user_id}",
        ),
        settings.download_rate_limit,
        settings.file_rate_window_seconds,
    )
    questionnaire = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    return _build_export_response(db, questionnaire, export_format)


@router.post("/questionnaires/{questionnaire_id}/export")
def export_and_mark_questionnaire(
    questionnaire_id: uuid.UUID,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    tenant: Tenant,
    db: Db,
    export_format: str = Query(default="xlsx", alias="format", pattern="^(csv|xlsx)$"),
) -> StreamingResponse:
    rate_limiter.check(
        client_key(request, "member-download", f"{tenant.organization_id}:{user.id}"),
        settings.download_rate_limit,
        settings.file_rate_window_seconds,
    )
    questionnaire = _get_questionnaire(db, tenant.organization_id, questionnaire_id)
    questionnaire.state = QuestionnaireState.EXPORTED
    add_audit_event(
        db,
        request,
        "questionnaire.exported",
        "questionnaire",
        questionnaire.id,
        tenant.organization_id,
        user,
        {"format": export_format},
    )
    db.commit()
    return _build_export_response(db, questionnaire, export_format)
