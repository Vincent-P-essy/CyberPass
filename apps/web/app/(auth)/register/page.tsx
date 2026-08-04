import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Créer un compte" };
export default function RegisterPage() {
  return (
    <AuthShell
      title="Créez votre espace de confiance."
      description="Une base claire pour collecter, vérifier et partager vos preuves de sécurité."
    >
      <RegisterForm />
    </AuthShell>
  );
}
