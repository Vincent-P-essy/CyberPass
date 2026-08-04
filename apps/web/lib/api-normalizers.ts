type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris"
  }).format(date);
}

function dateTimeLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris"
  }).format(date);
}

function normalizeControl(item: JsonRecord) {
  return {
    id: String(item.id ?? ""),
    code: String(item.code ?? ""),
    title: String(item.title ?? "Contrôle sans intitulé"),
    domain: String(item.category ?? item.domain ?? "Général"),
    description: String(item.description ?? ""),
    status: String(item.status ?? "NOT_ASSESSED"),
    evidenceCount: Number(item.evidenceCount ?? 0),
    owner: typeof item.owner === "string" ? item.owner : undefined,
    lastReviewed: item.lastVerifiedAt ? dateLabel(item.lastVerifiedAt) : undefined
  };
}

function normalizeQuestionnaire(item: JsonRecord, detailed: boolean) {
  const questions = Array.isArray(item.questions)
    ? item.questions.filter(isRecord).map((question) => {
        const answer = isRecord(question.answer) ? question.answer : undefined;
        return {
          id: String(question.id ?? ""),
          order: Number(question.displayOrder ?? 0),
          text: String(question.questionText ?? ""),
          proposedAnswer: String(answer?.editedAnswer ?? answer?.proposedAnswer ?? ""),
          status: String(question.answerStatus ?? "UNANSWERED"),
          confidence: typeof answer?.confidence === "number" ? answer.confidence : undefined,
          evidenceIds: Array.isArray(answer?.evidenceIds) ? answer.evidenceIds.map(String) : [],
          missingInformation: Array.isArray(answer?.missingInformation)
            ? answer.missingInformation.map(String)
            : []
        };
      })
    : undefined;
  const questionCount = Number(item.questionCount ?? questions?.length ?? 0);
  const approved = questions?.filter((question) => question.status === "APPROVED").length ?? 0;
  const state = String(item.state ?? item.status ?? "READY");
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? item.originalFilename ?? "Questionnaire"),
    customer: String(item.customer ?? "Client non renseigné"),
    status: state,
    progress: questions
      ? Math.round((approved / Math.max(questions.length, 1)) * 100)
      : state === "COMPLETED" || state === "EXPORTED"
        ? 100
        : 0,
    questionCount,
    reviewCount: questions
      ? questions.filter((question) => question.status !== "APPROVED").length
      : state === "COMPLETED" || state === "EXPORTED"
        ? 0
        : questionCount,
    importedAt: dateLabel(item.createdAt ?? item.importedAt),
    ...(detailed ? { questions: questions ?? [] } : {})
  };
}

export function normalizeApiResponse(path: string, payload: unknown): unknown {
  if (path === "/dashboard" && isRecord(payload)) {
    return {
      assessedControls: Number(payload.assessedControls ?? 0),
      verifiedControls: Number(payload.verifiedControls ?? 0),
      totalControls: Number(payload.totalControls ?? 0),
      expiringEvidence: Number(payload.expiringEvidences ?? 0),
      activeQuestionnaires: Number(payload.activeQuestionnaires ?? 0),
      pendingReviews: Number(payload.answersRequiringReview ?? 0),
      activePassports: Number(payload.activeShareLinks ?? 0)
    };
  }

  if (
    (path === "/controls" || /^\/controls\/[^/]+$/.test(path)) &&
    (Array.isArray(payload) || isRecord(payload))
  ) {
    return Array.isArray(payload)
      ? payload.filter(isRecord).map(normalizeControl)
      : normalizeControl(payload);
  }

  if (path === "/evidences" && Array.isArray(payload)) {
    return payload.filter(isRecord).map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? "Preuve sans titre"),
      type: String(item.evidenceType ?? "DOCUMENT"),
      confidentiality: String(item.confidentiality ?? "CONFIDENTIAL"),
      source: String(item.source ?? "Non renseignée"),
      controlCodes: [],
      controlIds: Array.isArray(item.controlIds) ? item.controlIds.map(String) : [],
      collectedAt: dateLabel(item.collectedAt),
      expiresAt: item.expiresAt ? dateLabel(item.expiresAt) : undefined,
      owner: "Organisation",
      sha256:
        typeof item.sha256 === "string"
          ? `${item.sha256.slice(0, 4)}…${item.sha256.slice(-4)}`
          : "Sans fichier"
    }));
  }

  if (path === "/questionnaires" && Array.isArray(payload)) {
    return payload.filter(isRecord).map((item) => normalizeQuestionnaire(item, false));
  }

  if (path === "/questionnaires/preview" && isRecord(payload)) {
    return {
      sheetName: String(payload.selectedSheet ?? "Feuille principale"),
      columns: Array.isArray(payload.columns) ? payload.columns.map(String) : [],
      questionColumn: String(payload.suggestedQuestionColumn ?? ""),
      rows: Array.isArray(payload.rows)
        ? payload.rows
            .filter(isRecord)
            .map((row) =>
              Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, String(value ?? "")])
              )
            )
        : [],
      detectedCount: Number(payload.detectedQuestionCount ?? 0)
    };
  }

  if (/^\/questionnaires\/[^/]+$/.test(path) && isRecord(payload)) {
    return normalizeQuestionnaire(payload, true);
  }

  if (path === "/audit-events" && Array.isArray(payload)) {
    return payload.filter(isRecord).map((event) => {
      const metadata = isRecord(event.eventMetadata) ? event.eventMetadata : {};
      const detailValue = metadata.title ?? metadata.filename ?? metadata.questionCount;
      return {
        id: String(event.id ?? ""),
        action: String(event.action ?? "unknown"),
        resource: String(event.resourceType ?? "Ressource"),
        actor: event.userId ? "Membre de l’organisation" : "Système",
        timestamp: dateTimeLabel(event.createdAt),
        detail: detailValue
          ? String(detailValue)
          : `Action sur ${String(event.resourceType ?? "une ressource")}`
      };
    });
  }

  if (path.startsWith("/public/passports/") && isRecord(payload)) {
    const organization = isRecord(payload.organization) ? payload.organization : {};
    return {
      organization: {
        name: String(organization.name ?? "Organisation"),
        ...(typeof organization.country === "string" && organization.country.trim()
          ? { country: organization.country }
          : {})
      },
      updatedAt: dateTimeLabel(payload.lastUpdatedAt),
      expiresAt: dateTimeLabel(payload.expiresAt),
      controls: Array.isArray(payload.controls)
        ? payload.controls.filter(isRecord).map((control) => ({
            id: String(control.id ?? ""),
            code: String(control.code ?? ""),
            title: String(control.title ?? ""),
            domain: String(control.category ?? "Général"),
            status: String(control.status ?? "NOT_ASSESSED"),
            lastVerified: control.lastVerifiedAt ? dateLabel(control.lastVerifiedAt) : undefined,
            expiresAt: control.expiresAt ? dateLabel(control.expiresAt) : undefined,
            evidenceSummaries: Array.isArray(control.evidences)
              ? control.evidences.filter(isRecord).map((evidence) => ({
                  title: String(evidence.title ?? "Preuve partageable"),
                  summary: String(evidence.description ?? "Résumé non renseigné."),
                  collectedAt: dateLabel(evidence.collectedAt)
                }))
              : []
          }))
        : []
    };
  }

  if (path === "/share-links" && isRecord(payload)) {
    return {
      ...payload,
      publicUrl: typeof payload.publicPath === "string" ? payload.publicPath : undefined
    };
  }

  return payload;
}
