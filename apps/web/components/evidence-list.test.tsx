import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Control, Evidence } from "@/lib/types";
import { EvidenceList } from "./evidence-list";

describe("EvidenceList", () => {
  it("mappe un UUID de contrôle vers son vrai code", () => {
    const control = {
      id: "a8ebc09f-bf31-43b8-a398-abf514debf1f",
      code: "CP-ACC-01",
      title: "MFA",
      domain: "Accès",
      description: "",
      status: "IMPLEMENTED",
      evidenceCount: 1
    } satisfies Control;
    const evidence = {
      id: "evidence-1",
      title: "Preuve MFA",
      type: "DOCUMENT",
      confidentiality: "SHARED_SUMMARY",
      source: "Test",
      controlCodes: [],
      controlIds: [control.id],
      collectedAt: "4 août 2026",
      owner: "Organisation",
      sha256: "sans fichier"
    } satisfies Evidence;

    render(<EvidenceList evidence={[evidence]} controls={[control]} />);
    expect(screen.getByText("CP-ACC-01")).toBeInTheDocument();
    expect(screen.queryByText(/a8ebc09f/)).not.toBeInTheDocument();
  });
});
