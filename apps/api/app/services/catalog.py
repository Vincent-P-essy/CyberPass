import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Control, Framework, OrganizationControl

STARTER_CONTROLS = [
    (
        "CP-01",
        "MFA pour les administrateurs",
        "Identité",
        "Les comptes d'administration utilisent une authentification multifacteur.",
    ),
    (
        "CP-02",
        "Chiffrement des postes",
        "Terminaux",
        "Les postes de travail sont chiffrés au repos.",
    ),
    (
        "CP-03",
        "Sauvegardes",
        "Résilience",
        "Les données critiques font l'objet de sauvegardes régulières.",
    ),
    (
        "CP-04",
        "Tests de restauration",
        "Résilience",
        "La restauration des sauvegardes est testée périodiquement.",
    ),
    (
        "CP-05",
        "Gestion des correctifs",
        "Vulnérabilités",
        "Les correctifs de sécurité sont priorisés et déployés selon une procédure définie.",
    ),
    (
        "CP-06",
        "Gestion des vulnérabilités",
        "Vulnérabilités",
        "Les vulnérabilités sont détectées, qualifiées et suivies jusqu'à leur correction.",
    ),
    (
        "CP-07",
        "Revue des comptes",
        "Identité",
        "Les droits et comptes actifs font l'objet de revues périodiques.",
    ),
    (
        "CP-08",
        "Journalisation",
        "Détection",
        "Les événements de sécurité utiles sont journalisés et conservés.",
    ),
    (
        "CP-09",
        "Réponse aux incidents",
        "Incidents",
        "Un processus de détection, qualification et réponse aux incidents est défini.",
    ),
    (
        "CP-10",
        "Gestion des fournisseurs",
        "Tiers",
        "Les risques de sécurité liés aux fournisseurs sont évalués et suivis.",
    ),
    (
        "CP-11",
        "Protection des dépôts de code",
        "Développement",
        "Les dépôts de code appliquent des contrôles d'accès et de revue.",
    ),
    (
        "CP-12",
        "Gestion des secrets",
        "Développement",
        "Les secrets applicatifs sont stockés, utilisés et renouvelés de façon maîtrisée.",
    ),
    (
        "CP-13",
        "Continuité d'activité",
        "Résilience",
        "Les activités critiques disposent de dispositions de continuité documentées.",
    ),
    (
        "CP-14",
        "Sensibilisation des utilisateurs",
        "Personnel",
        "Les collaborateurs suivent une sensibilisation régulière à la cybersécurité.",
    ),
    (
        "CP-15",
        "Classification des données",
        "Données",
        "Les données sont classifiées afin d'appliquer des protections proportionnées.",
    ),
]


def ensure_starter_framework(db: Session) -> Framework:
    framework = db.scalar(
        select(Framework).where(
            Framework.name == "CyberPass Starter Framework", Framework.is_global.is_(True)
        )
    )
    if framework is not None:
        return framework
    framework = Framework(
        name="CyberPass Starter Framework",
        version="1.0",
        description=(
            "Référentiel de démonstration CyberPass. Il ne constitue ni une certification "
            "ni l'intégration officielle d'un référentiel réglementaire."
        ),
        is_demo=True,
        is_global=True,
    )
    db.add(framework)
    db.flush()
    for order, (code, title, category, description) in enumerate(STARTER_CONTROLS, start=1):
        db.add(
            Control(
                framework_id=framework.id,
                code=code,
                title=title,
                category=category,
                description=description,
                guidance=(
                    "Ajoutez une preuve datée, attribuée et vérifiable avant de mettre "
                    "à jour le statut."
                ),
                display_order=order,
            )
        )
    db.flush()
    return framework


def attach_framework_to_organization(db: Session, organization_id: uuid.UUID) -> Framework:
    framework = ensure_starter_framework(db)
    control_ids = db.scalars(select(Control.id).where(Control.framework_id == framework.id)).all()
    existing = set(
        db.scalars(
            select(OrganizationControl.control_id).where(
                OrganizationControl.organization_id == organization_id,
                OrganizationControl.control_id.in_(control_ids),
            )
        ).all()
    )
    db.add_all(
        OrganizationControl(organization_id=organization_id, control_id=control_id)
        for control_id in control_ids
        if control_id not in existing
    )
    db.flush()
    return framework
