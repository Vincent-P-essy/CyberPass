import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password, hash_token
from app.models import (
    AnswerEvidenceLink,
    AnswerStatus,
    AuditEvent,
    Confidentiality,
    Control,
    ControlStatus,
    Evidence,
    EvidenceControlLink,
    EvidenceType,
    Membership,
    Organization,
    OrganizationControl,
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireState,
    Role,
    ShareLink,
    ShareLinkControl,
    ShareLinkEvidence,
    SuggestedAnswer,
    User,
)
from app.services.catalog import attach_framework_to_organization

DEMO_QUESTIONS = [
    "L'authentification multifacteur est-elle imposée aux administrateurs ?",
    "Les postes de travail sont-ils chiffrés au repos ?",
    "À quelle fréquence les sauvegardes sont-elles réalisées ?",
    "Quand le dernier test de restauration a-t-il été effectué ?",
    "Comment les correctifs critiques sont-ils déployés ?",
    "Disposez-vous d'un processus de gestion des vulnérabilités ?",
    "Les droits d'accès font-ils l'objet d'une revue périodique ?",
    "Quels événements de sécurité sont journalisés ?",
    "Votre procédure de réponse aux incidents est-elle testée ?",
    "Comment évaluez-vous les risques liés à vos fournisseurs ?",
]


def seed() -> None:
    with SessionLocal() as db:
        existing = db.scalar(select(Organization).where(Organization.slug == "cyberpass-demo"))
        if existing:
            print("Les données de démonstration existent déjà.")
            return

        owner = User(
            email="vincent.plessy@demo.example.com",
            full_name="Plessy Vincent",
            password_hash=hash_password("CyberPass-Demo-2026"),
        )
        analyst = User(
            email="analyste@demo.example.com",
            full_name="Camille Martin",
            password_hash=hash_password("CyberPass-Demo-2026"),
        )
        organization = Organization(
            name="Helios Logic (démo)",
            slug="cyberpass-demo",
            description="Entreprise fictive utilisée exclusivement pour la démonstration.",
        )
        db.add_all([owner, analyst, organization])
        db.flush()
        db.add_all(
            [
                Membership(organization_id=organization.id, user_id=owner.id, role=Role.OWNER),
                Membership(organization_id=organization.id, user_id=analyst.id, role=Role.ANALYST),
            ]
        )
        framework = attach_framework_to_organization(db, organization.id)
        controls = db.scalars(
            select(Control)
            .where(Control.framework_id == framework.id)
            .order_by(Control.display_order)
        ).all()
        for index, control in enumerate(controls[:5]):
            state = db.scalar(
                select(OrganizationControl).where(
                    OrganizationControl.organization_id == organization.id,
                    OrganizationControl.control_id == control.id,
                )
            )
            if state:
                state.status = ControlStatus.VERIFIED if index < 2 else ControlStatus.IMPLEMENTED
                state.last_verified_at = datetime.now(UTC) - timedelta(days=index * 7)

        evidences = [
            Evidence(
                organization_id=organization.id,
                title="Procédure de gestion des accès — synthèse",
                description=(
                    "Procédure fictive décrivant l'activation du MFA et les revues trimestrielles."
                ),
                public_summary="Le MFA est requis pour les comptes d'administration.",
                evidence_type=EvidenceType.POLICY,
                confidentiality=Confidentiality.SHARED_SUMMARY,
                source="Référentiel interne de démonstration",
                collected_at=datetime.now(UTC) - timedelta(days=20),
                expires_at=datetime.now(UTC) + timedelta(days=345),
                owner_id=owner.id,
            ),
            Evidence(
                organization_id=organization.id,
                title="Attestation de chiffrement des postes",
                description="Attestation fictive issue de l'outil de gestion des terminaux.",
                public_summary="Le parc géré applique le chiffrement intégral des disques.",
                evidence_type=EvidenceType.MANUAL_ATTESTATION,
                confidentiality=Confidentiality.SHARED_SUMMARY,
                source="Console de gestion fictive",
                collected_at=datetime.now(UTC) - timedelta(days=10),
                expires_at=datetime.now(UTC) + timedelta(days=80),
                owner_id=analyst.id,
            ),
            Evidence(
                organization_id=organization.id,
                title="Compte rendu de restauration",
                description="Détails techniques fictifs réservés aux collaborateurs autorisés.",
                evidence_type=EvidenceType.DOCUMENT,
                confidentiality=Confidentiality.CONFIDENTIAL,
                source="Exercice interne fictif",
                collected_at=datetime.now(UTC) - timedelta(days=40),
                expires_at=datetime.now(UTC) + timedelta(days=140),
                owner_id=owner.id,
            ),
        ]
        db.add_all(evidences)
        db.flush()
        for evidence, control in zip(evidences, controls[:3], strict=True):
            db.add(
                EvidenceControlLink(
                    organization_id=organization.id,
                    evidence_id=evidence.id,
                    control_id=control.id,
                )
            )

        questionnaire = Questionnaire(
            organization_id=organization.id,
            name="Questionnaire client de démonstration",
            original_filename="questionnaire-demo.xlsx",
            source_format="xlsx",
            state=QuestionnaireState.IN_REVIEW,
            sheet_name="Questionnaire sécurité",
            question_column="Question",
            original_columns=["Référence", "Question", "Commentaire client"],
            mapping={"questionColumn": "Question", "sheetName": "Questionnaire sécurité"},
            imported_by_id=analyst.id,
        )
        db.add(questionnaire)
        db.flush()
        questions = []
        for index, text in enumerate(DEMO_QUESTIONS, start=1):
            question = QuestionnaireQuestion(
                organization_id=organization.id,
                questionnaire_id=questionnaire.id,
                display_order=index,
                question_text=text,
                original_row={"Référence": f"Q-{index:02d}", "Question": text},
                answer_status=AnswerStatus.GENERATED if index <= 3 else AnswerStatus.UNANSWERED,
            )
            db.add(question)
            questions.append(question)
        db.flush()
        for question, evidence, control in zip(questions[:3], evidences, controls[:3], strict=True):
            answer = SuggestedAnswer(
                organization_id=organization.id,
                question_id=question.id,
                proposed_answer=(
                    f"La preuve « {evidence.title} » documente un élément de réponse. "
                    "Une validation humaine reste requise avant diffusion."
                ),
                confidence=0.72,
                missing_information=[],
                risk_flags=[],
                control_ids=[str(control.id)],
                requires_human_review=True,
                model_version="cyberpass-deterministic-v1",
            )
            db.add(answer)
            db.flush()
            db.add(
                AnswerEvidenceLink(
                    organization_id=organization.id,
                    answer_id=answer.id,
                    evidence_id=evidence.id,
                )
            )

        share_token = secrets.token_urlsafe(48)
        share = ShareLink(
            organization_id=organization.id,
            title="Passeport commercial — démo",
            token_hash=hash_token(share_token),
            expires_at=datetime.now(UTC) + timedelta(days=30),
            created_by_id=owner.id,
        )
        db.add(share)
        db.flush()
        db.add_all(
            ShareLinkControl(
                organization_id=organization.id,
                share_link_id=share.id,
                control_id=control.id,
            )
            for control in controls[:2]
        )
        db.add_all(
            ShareLinkEvidence(
                organization_id=organization.id,
                share_link_id=share.id,
                evidence_id=evidence.id,
            )
            for evidence in evidences[:2]
        )
        db.add(
            AuditEvent(
                organization_id=organization.id,
                user_id=owner.id,
                action="demo.seeded",
                resource_type="organization",
                resource_id=str(organization.id),
                event_metadata={"framework": "CyberPass Starter Framework"},
            )
        )
        db.commit()
        print("Données de démonstration créées.")
        print("Compte propriétaire: vincent.plessy@demo.example.com / CyberPass-Demo-2026")
        print(
            "Passeport public (jeton affiché une seule fois): "
            f"/api/v1/public/passports/{share_token}"
        )


if __name__ == "__main__":
    seed()
