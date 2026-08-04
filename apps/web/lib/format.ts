import type { AnswerStatus, Confidentiality, ControlStatus, QuestionnaireStatus } from "./types";

export const controlStatusLabel: Record<ControlStatus, string> = {
  NOT_ASSESSED: "À évaluer",
  NOT_IMPLEMENTED: "Non mis en œuvre",
  PARTIAL: "Partiel",
  IMPLEMENTED: "Mis en œuvre",
  VERIFIED: "Vérifié",
  NOT_APPLICABLE: "Non applicable"
};

export const questionnaireStatusLabel: Record<QuestionnaireStatus, string> = {
  IMPORTED: "Importé",
  PROCESSING: "En traitement",
  READY: "Prêt",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  EXPORTED: "Exporté",
  FAILED: "Échec"
};

export const answerStatusLabel: Record<AnswerStatus, string> = {
  UNANSWERED: "Sans réponse",
  GENERATED: "À valider",
  NEEDS_INFORMATION: "Information requise",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  MANUALLY_ANSWERED: "Réponse manuelle"
};

export const confidentialityLabel: Record<Confidentiality, string> = {
  PUBLIC: "Public",
  SHARED_SUMMARY: "Résumé partageable",
  CONFIDENTIAL: "Confidentiel",
  RESTRICTED: "Restreint"
};
