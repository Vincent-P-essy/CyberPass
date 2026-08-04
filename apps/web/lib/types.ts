export type ControlStatus =
  "NOT_ASSESSED" | "NOT_IMPLEMENTED" | "PARTIAL" | "IMPLEMENTED" | "VERIFIED" | "NOT_APPLICABLE";

export type Confidentiality = "PUBLIC" | "SHARED_SUMMARY" | "CONFIDENTIAL" | "RESTRICTED";
export type QuestionnaireStatus =
  "IMPORTED" | "PROCESSING" | "READY" | "IN_REVIEW" | "COMPLETED" | "EXPORTED" | "FAILED";

export type AnswerStatus =
  "UNANSWERED" | "GENERATED" | "NEEDS_INFORMATION" | "APPROVED" | "REJECTED" | "MANUALLY_ANSWERED";

export interface Control {
  id: string;
  code: string;
  title: string;
  domain: string;
  description: string;
  status: ControlStatus;
  evidenceCount: number;
  owner?: string;
  lastReviewed?: string;
}

export interface Evidence {
  id: string;
  title: string;
  type:
    | "DOCUMENT"
    | "SCREENSHOT"
    | "API_CHECK"
    | "POLICY"
    | "CERTIFICATE"
    | "MANUAL_ATTESTATION"
    | "LINK";
  confidentiality: Confidentiality;
  source: string;
  controlCodes: string[];
  controlIds?: string[];
  collectedAt: string;
  expiresAt?: string;
  owner: string;
  sha256: string;
}

export interface QuestionnaireQuestion {
  id: string;
  order: number;
  text: string;
  proposedAnswer: string;
  status: AnswerStatus;
  confidence?: number;
  evidenceIds: string[];
  missingInformation: string[];
}

export interface Questionnaire {
  id: string;
  name: string;
  customer: string;
  status: QuestionnaireStatus;
  progress: number;
  questionCount: number;
  reviewCount: number;
  importedAt: string;
  questions?: QuestionnaireQuestion[];
}

export interface AuditEvent {
  id: string;
  action: string;
  resource: string;
  actor: string;
  timestamp: string;
  detail: string;
}

export interface DashboardData {
  assessedControls: number;
  verifiedControls: number;
  totalControls: number;
  expiringEvidence: number;
  activeQuestionnaires: number;
  pendingReviews: number;
  activePassports: number;
}

export interface DataResult<T> {
  data: T;
  source: "api" | "demo";
  message?: string;
}

export interface PublicPassport {
  organization: { name: string; website?: string; country?: string };
  updatedAt: string;
  expiresAt: string;
  controls: Array<{
    id: string;
    code: string;
    title: string;
    domain: string;
    status: ControlStatus;
    lastVerified?: string;
    expiresAt?: string;
    evidenceSummaries: Array<{ title: string; summary: string; collectedAt: string }>;
  }>;
}
