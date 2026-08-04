import type { AuditEvent, Control, DashboardData, Evidence, Questionnaire } from "./types";

export const demoControls: Control[] = [
  {
    id: "mfa-admin",
    code: "CP-ACC-01",
    title: "MFA des comptes administrateurs",
    domain: "Identités et accès",
    description:
      "Imposer un second facteur résistant au phishing pour tous les accès administratifs.",
    status: "VERIFIED",
    evidenceCount: 2,
    owner: "Équipe IT",
    lastReviewed: "18 juil. 2026"
  },
  {
    id: "endpoint-encryption",
    code: "CP-DAT-01",
    title: "Chiffrement des postes",
    domain: "Protection des données",
    description:
      "Chiffrer les volumes des postes professionnels et conserver une preuve de couverture.",
    status: "IMPLEMENTED",
    evidenceCount: 1,
    owner: "Équipe IT",
    lastReviewed: "15 juil. 2026"
  },
  {
    id: "backups",
    code: "CP-RES-01",
    title: "Sauvegardes régulières",
    domain: "Résilience",
    description: "Réaliser et superviser des sauvegardes selon des objectifs documentés.",
    status: "VERIFIED",
    evidenceCount: 3,
    owner: "Infrastructure",
    lastReviewed: "23 juil. 2026"
  },
  {
    id: "restore-tests",
    code: "CP-RES-02",
    title: "Tests de restauration",
    domain: "Résilience",
    description: "Tester périodiquement la restauration et tracer les résultats.",
    status: "PARTIAL",
    evidenceCount: 1,
    owner: "Infrastructure",
    lastReviewed: "02 juin 2026"
  },
  {
    id: "patching",
    code: "CP-VUL-01",
    title: "Gestion des correctifs",
    domain: "Vulnérabilités",
    description: "Déployer les correctifs selon la criticité et les délais définis.",
    status: "IMPLEMENTED",
    evidenceCount: 2,
    owner: "Équipe IT",
    lastReviewed: "21 juil. 2026"
  },
  {
    id: "vulnerability",
    code: "CP-VUL-02",
    title: "Gestion des vulnérabilités",
    domain: "Vulnérabilités",
    description: "Identifier, qualifier et corriger les vulnérabilités dans des délais maîtrisés.",
    status: "PARTIAL",
    evidenceCount: 1,
    owner: "Sécurité",
    lastReviewed: "10 juil. 2026"
  },
  {
    id: "account-review",
    code: "CP-ACC-02",
    title: "Revue des comptes",
    domain: "Identités et accès",
    description: "Revoir périodiquement les droits et supprimer les accès devenus inutiles.",
    status: "IMPLEMENTED",
    evidenceCount: 1,
    owner: "RH & IT",
    lastReviewed: "01 juil. 2026"
  },
  {
    id: "logging",
    code: "CP-DET-01",
    title: "Journalisation de sécurité",
    domain: "Détection",
    description: "Centraliser les journaux utiles et définir des durées de conservation.",
    status: "PARTIAL",
    evidenceCount: 2,
    owner: "Sécurité",
    lastReviewed: "14 juil. 2026"
  },
  {
    id: "incident",
    code: "CP-IR-01",
    title: "Réponse aux incidents",
    domain: "Gestion des incidents",
    description: "Maintenir un plan de réponse, des rôles et des canaux d'escalade testés.",
    status: "IMPLEMENTED",
    evidenceCount: 2,
    owner: "Sécurité",
    lastReviewed: "29 juin 2026"
  },
  {
    id: "suppliers",
    code: "CP-TPR-01",
    title: "Gestion des fournisseurs",
    domain: "Tiers",
    description: "Évaluer les risques des fournisseurs et encadrer les exigences contractuelles.",
    status: "NOT_ASSESSED",
    evidenceCount: 0
  },
  {
    id: "repositories",
    code: "CP-SDL-01",
    title: "Protection des dépôts de code",
    domain: "Développement sécurisé",
    description: "Protéger les branches, les revues et les droits sur le code source.",
    status: "VERIFIED",
    evidenceCount: 2,
    owner: "Engineering",
    lastReviewed: "25 juil. 2026"
  },
  {
    id: "secrets",
    code: "CP-SDL-02",
    title: "Gestion des secrets",
    domain: "Développement sécurisé",
    description: "Stocker, renouveler et détecter les secrets de manière centralisée.",
    status: "IMPLEMENTED",
    evidenceCount: 1,
    owner: "Platform",
    lastReviewed: "25 juil. 2026"
  },
  {
    id: "continuity",
    code: "CP-RES-03",
    title: "Continuité d’activité",
    domain: "Résilience",
    description:
      "Documenter et tester les dispositions assurant la continuité des services critiques.",
    status: "PARTIAL",
    evidenceCount: 1,
    owner: "Direction",
    lastReviewed: "12 mai 2026"
  },
  {
    id: "awareness",
    code: "CP-PEO-01",
    title: "Sensibilisation des utilisateurs",
    domain: "Culture sécurité",
    description: "Former régulièrement les collaborateurs aux risques et bonnes pratiques.",
    status: "IMPLEMENTED",
    evidenceCount: 1,
    owner: "RH",
    lastReviewed: "06 juil. 2026"
  },
  {
    id: "classification",
    code: "CP-DAT-02",
    title: "Classification des données",
    domain: "Protection des données",
    description: "Classifier les données et appliquer les règles de traitement associées.",
    status: "NOT_IMPLEMENTED",
    evidenceCount: 0,
    owner: "DPO"
  }
];

export const demoEvidence: Evidence[] = [
  {
    id: "ev-mfa",
    title: "Export de couverture MFA — juillet 2026",
    type: "SCREENSHOT",
    confidentiality: "CONFIDENTIAL",
    source: "Console d’identité",
    controlCodes: ["CP-ACC-01"],
    collectedAt: "18 juil. 2026",
    expiresAt: "18 oct. 2026",
    owner: "Plessy Vincent",
    sha256: "81d9…d42e"
  },
  {
    id: "ev-backup",
    title: "Rapport de sauvegarde trimestriel",
    type: "DOCUMENT",
    confidentiality: "SHARED_SUMMARY",
    source: "Supervision interne",
    controlCodes: ["CP-RES-01", "CP-RES-02"],
    collectedAt: "23 juil. 2026",
    expiresAt: "23 oct. 2026",
    owner: "Plessy Vincent",
    sha256: "4f2a…7c10"
  },
  {
    id: "ev-policy",
    title: "Politique de gestion des incidents v3",
    type: "POLICY",
    confidentiality: "SHARED_SUMMARY",
    source: "Référentiel documentaire",
    controlCodes: ["CP-IR-01"],
    collectedAt: "29 juin 2026",
    expiresAt: "29 juin 2027",
    owner: "Plessy Vincent",
    sha256: "c12f…9a81"
  },
  {
    id: "ev-repo",
    title: "Configuration des règles de branches",
    type: "API_CHECK",
    confidentiality: "CONFIDENTIAL",
    source: "Forge logicielle",
    controlCodes: ["CP-SDL-01"],
    collectedAt: "25 juil. 2026",
    expiresAt: "25 août 2026",
    owner: "Plessy Vincent",
    sha256: "6aa0…bf12"
  },
  {
    id: "ev-training",
    title: "Attestation de campagne de sensibilisation",
    type: "MANUAL_ATTESTATION",
    confidentiality: "PUBLIC",
    source: "Équipe RH",
    controlCodes: ["CP-PEO-01"],
    collectedAt: "06 juil. 2026",
    expiresAt: "06 juil. 2027",
    owner: "Plessy Vincent",
    sha256: "Sans fichier"
  }
];

export const demoQuestionnaires: Questionnaire[] = [
  {
    id: "q-grandcompte",
    name: "Évaluation fournisseur — Grand Compte",
    customer: "Client de démonstration",
    status: "IN_REVIEW",
    progress: 70,
    questionCount: 10,
    reviewCount: 3,
    importedAt: "28 juil. 2026",
    questions: [
      {
        id: "q1",
        order: 1,
        text: "L'authentification multifacteur est-elle exigée pour les comptes administrateurs ?",
        proposedAnswer:
          "Oui. L'organisation impose l'authentification multifacteur pour les accès administratifs. La couverture a été revue le 18 juillet 2026.",
        status: "GENERATED",
        confidence: 0.94,
        evidenceIds: ["ev-mfa"],
        missingInformation: []
      },
      {
        id: "q2",
        order: 2,
        text: "À quelle fréquence testez-vous la restauration de vos sauvegardes ?",
        proposedAnswer:
          "Des tests de restauration sont réalisés, mais la fréquence cible n'est pas suffisamment étayée par les éléments disponibles.",
        status: "NEEDS_INFORMATION",
        confidence: 0.55,
        evidenceIds: ["ev-backup"],
        missingInformation: ["Fréquence de test approuvée", "Résultat du dernier test complet"]
      },
      {
        id: "q3",
        order: 3,
        text: "Disposez-vous d'un plan formalisé de réponse aux incidents ?",
        proposedAnswer:
          "Oui. Un plan de gestion des incidents définit les rôles et le circuit d'escalade. Sa version 3 a été collectée le 29 juin 2026.",
        status: "APPROVED",
        confidence: 0.91,
        evidenceIds: ["ev-policy"],
        missingInformation: []
      },
      {
        id: "q4",
        order: 4,
        text: "Vos dépôts de code appliquent-ils des règles de protection des branches ?",
        proposedAnswer:
          "Oui, des règles de revue et de protection sont configurées sur les dépôts couverts par la preuve associée.",
        status: "GENERATED",
        confidence: 0.86,
        evidenceIds: ["ev-repo"],
        missingInformation: []
      }
    ]
  },
  {
    id: "q-prospect",
    name: "Due diligence — Prospect Europe",
    customer: "Prospect de démonstration",
    status: "READY",
    progress: 0,
    questionCount: 18,
    reviewCount: 18,
    importedAt: "01 août 2026"
  },
  {
    id: "q-renewal",
    name: "Revue annuelle 2026",
    customer: "Partenaire de démonstration",
    status: "COMPLETED",
    progress: 100,
    questionCount: 24,
    reviewCount: 0,
    importedAt: "12 juin 2026"
  }
];

export const demoAudit: AuditEvent[] = [
  {
    id: "a1",
    action: "QUESTIONNAIRE_ANSWER_APPROVED",
    resource: "Questionnaire",
    actor: "Plessy Vincent",
    timestamp: "Aujourd'hui, 10:42",
    detail: "Réponse 3 approuvée"
  },
  {
    id: "a2",
    action: "EVIDENCE_CREATED",
    resource: "Preuve",
    actor: "Plessy Vincent",
    timestamp: "Aujourd'hui, 09:18",
    detail: "Configuration des règles de branches"
  },
  {
    id: "a3",
    action: "CONTROL_UPDATED",
    resource: "Contrôle",
    actor: "Plessy Vincent",
    timestamp: "Hier, 16:05",
    detail: "CP-SDL-01 marqué comme vérifié"
  },
  {
    id: "a4",
    action: "SHARE_LINK_VIEWED",
    resource: "Passeport",
    actor: "Visiteur externe",
    timestamp: "Hier, 14:31",
    detail: "Consultation du passeport partagé"
  },
  {
    id: "a5",
    action: "AI_SUGGESTION_GENERATED",
    resource: "Questionnaire",
    actor: "Plessy Vincent",
    timestamp: "28 juil. 2026, 11:09",
    detail: "10 suggestions générées avec revue humaine requise"
  },
  {
    id: "a6",
    action: "QUESTIONNAIRE_IMPORTED",
    resource: "Questionnaire",
    actor: "Plessy Vincent",
    timestamp: "28 juil. 2026, 11:04",
    detail: "Évaluation fournisseur — Grand Compte"
  },
  {
    id: "a7",
    action: "ORGANIZATION_CREATED",
    resource: "Organisation",
    actor: "Plessy Vincent",
    timestamp: "02 mai 2026, 08:44",
    detail: "Acme Cloud Europe"
  }
];

export const demoDashboard: DashboardData = {
  assessedControls: 13,
  verifiedControls: 3,
  totalControls: 15,
  expiringEvidence: 2,
  activeQuestionnaires: 2,
  pendingReviews: 21,
  activePassports: 1
};
