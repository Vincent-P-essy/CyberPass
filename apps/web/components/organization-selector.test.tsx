import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiMutation } from "@/lib/api";
import { OrganizationSelector } from "./organization-selector";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api", () => ({ apiMutation: vi.fn() }));

describe("OrganizationSelector", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(apiMutation).mockReset();
  });

  it("n’ouvre aucun tenant sans choix explicite", async () => {
    vi.mocked(apiMutation).mockResolvedValue({
      ok: true,
      persisted: true,
      message: "Organisation sélectionnée"
    });
    const user = userEvent.setup();
    render(
      <OrganizationSelector
        memberships={[
          { organizationId: "org-a", organizationName: "Organisation A", role: "OWNER" },
          { organizationId: "org-b", organizationName: "Organisation B", role: "VIEWER" }
        ]}
      />
    );

    const continueButton = screen.getByRole("button", { name: "Continuer vers l’espace" });
    expect(continueButton).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Organisation B/ }));
    await user.click(continueButton);

    expect(apiMutation).toHaveBeenCalledWith("/organizations/org-b/select", expect.any(Object));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
