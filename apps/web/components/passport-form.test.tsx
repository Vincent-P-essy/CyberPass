import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiMutation } from "@/lib/api";
import { demoControls, demoEvidence } from "@/lib/demo-data";
import { PassportForm } from "./passport-form";

vi.mock("@/lib/api", () => ({ apiMutation: vi.fn(), demoMode: true }));

describe("PassportForm", () => {
  beforeEach(() => vi.mocked(apiMutation).mockReset());

  it("envoie uniquement les preuves partageables explicitement sélectionnées", async () => {
    vi.mocked(apiMutation).mockResolvedValue({
      ok: true,
      persisted: false,
      message: "Créé en démonstration"
    });
    const user = userEvent.setup();
    render(<PassportForm controls={demoControls} evidence={demoEvidence} />);

    expect(
      screen.queryByRole("checkbox", { name: /Export de couverture MFA/i })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Rapport de sauvegarde trimestriel/i }));
    await user.click(screen.getByRole("button", { name: "Créer le lien limité" }));

    await waitFor(() => expect(apiMutation).toHaveBeenCalledTimes(1));
    const options = vi.mocked(apiMutation).mock.calls[0]?.[1];
    const payload = JSON.parse(String(options?.body)) as { evidenceIds: string[] };
    expect(payload.evidenceIds).toEqual(["ev-backup"]);
  });
});
