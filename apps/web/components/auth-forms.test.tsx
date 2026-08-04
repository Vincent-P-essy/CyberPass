import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./auth-forms";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("LoginForm", () => {
  beforeEach(() => push.mockReset());

  it("empêche la soumission d’identifiants invalides", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const email = screen.getByLabelText(/Adresse e-mail/);
    const password = screen.getByLabelText(/Mot de passe/);
    await user.clear(email);
    await user.type(email, "adresse-invalide");
    await user.clear(password);
    await user.type(password, "court");
    await user.click(screen.getByRole("button", { name: /Ouvrir l’espace|Se connecter/ }));
    expect(await screen.findByText("Saisissez une adresse e-mail valide.")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe contient au moins 8 caractères.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
