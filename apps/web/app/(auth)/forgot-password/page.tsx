import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Retrouvez votre accès."
      description="Indiquez votre adresse professionnelle. La réponse reste volontairement neutre pour protéger les comptes."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
