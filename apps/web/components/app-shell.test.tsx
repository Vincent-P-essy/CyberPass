import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiMutation } from "@/lib/api";
import { AppShell } from "./app-shell";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push, refresh })
}));

vi.mock("@/lib/api", () => ({ apiMutation: vi.fn() }));

describe("AppShell logout", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(apiMutation).mockReset();
  });

  it("garde la session et affiche une erreur si la déconnexion échoue", async () => {
    vi.mocked(apiMutation).mockResolvedValue({
      ok: false,
      persisted: false,
      message: "API indisponible"
    });
    const user = userEvent.setup();
    render(
      <AppShell
        organizations={[{ id: "org-1", name: "Organisation", initials: "OR" }]}
        currentOrganizationId="org-1"
        user={{ name: "Plessy Vincent", initials: "PV", role: "Propriétaire" }}
      >
        <p>Contenu</p>
      </AppShell>
    );

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Votre session reste active");
    expect(push).not.toHaveBeenCalled();
  });
});
