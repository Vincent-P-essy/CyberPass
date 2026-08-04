export const CONTROL_STATUSES = [
  "NOT_ASSESSED",
  "NOT_IMPLEMENTED",
  "PARTIAL",
  "IMPLEMENTED",
  "VERIFIED",
  "NOT_APPLICABLE",
] as const;

export type ControlStatus = (typeof CONTROL_STATUSES)[number];

export const EVIDENCE_CONFIDENTIALITIES = [
  "PUBLIC",
  "SHARED_SUMMARY",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;

export type EvidenceConfidentiality =
  (typeof EVIDENCE_CONFIDENTIALITIES)[number];

export const QUESTIONNAIRE_STATUSES = [
  "IMPORTED",
  "PROCESSING",
  "READY",
  "IN_REVIEW",
  "COMPLETED",
  "EXPORTED",
  "FAILED",
] as const;

export type QuestionnaireStatus = (typeof QUESTIONNAIRE_STATUSES)[number];

export interface ApiError {
  detail: string;
  requestId?: string;
}
