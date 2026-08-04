import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidentialityBadge, StatusBadge } from "./status-badge";

describe("status badges", () => {
  it("traduit les statuts métier en français", () => {
    render(
      <>
        <StatusBadge status="NEEDS_INFORMATION" />
        <StatusBadge status="VERIFIED" />
      </>
    );
    expect(screen.getByText("Information requise")).toBeInTheDocument();
    expect(screen.getByText("Vérifié")).toBeInTheDocument();
  });

  it("rend le niveau de confidentialité explicite", () => {
    render(<ConfidentialityBadge level="CONFIDENTIAL" />);
    expect(screen.getByText("Confidentiel")).toBeInTheDocument();
  });
});
