import { describe, expect, it } from "vitest";
import { normalizeApiResponse } from "./api-normalizers";
import type { PublicPassport } from "./types";

describe("normalisation du passeport public", () => {
  it("n’invente pas un pays absent de la réponse API", () => {
    const passport = normalizeApiResponse("/public/passports/token", {
      organization: { name: "Organisation exemple" },
      lastUpdatedAt: "2026-08-04T10:00:00Z",
      expiresAt: "2026-09-04T10:00:00Z",
      controls: []
    }) as PublicPassport;

    expect(passport.organization).toEqual({ name: "Organisation exemple" });
    expect(passport.organization.country).toBeUndefined();
  });
});

describe("normalisation des preuves", () => {
  it("conserve les UUID de contrôles sans les présenter comme de faux codes", () => {
    const controlId = "a8ebc09f-bf31-43b8-a398-abf514debf1f";
    const evidence = normalizeApiResponse("/evidences", [
      {
        id: "evidence-1",
        title: "Preuve",
        evidenceType: "DOCUMENT",
        confidentiality: "SHARED_SUMMARY",
        collectedAt: "2026-08-04T10:00:00Z",
        controlIds: [controlId]
      }
    ]) as Array<{ controlIds: string[]; controlCodes: string[] }>;

    expect(evidence[0]?.controlIds).toEqual([controlId]);
    expect(evidence[0]?.controlCodes).toEqual([]);
  });
});

describe("normalisation de l’aperçu questionnaire", () => {
  it("priorise la route preview sur la route dynamique d’un questionnaire", () => {
    const preview = normalizeApiResponse("/questionnaires/preview", {
      selectedSheet: "Security",
      columns: ["ID", "Question"],
      suggestedQuestionColumn: "Question",
      rows: [{ ID: "Q1", Question: "Le MFA est-il actif ?" }],
      detectedQuestionCount: 1
    }) as {
      sheetName: string;
      columns: string[];
      questionColumn: string;
      rows: Array<Record<string, string>>;
      detectedCount: number;
    };

    expect(preview).toEqual({
      sheetName: "Security",
      columns: ["ID", "Question"],
      questionColumn: "Question",
      rows: [{ ID: "Q1", Question: "Le MFA est-il actif ?" }],
      detectedCount: 1
    });
  });
});
