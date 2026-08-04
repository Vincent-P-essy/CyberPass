import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Connexion" };
export default function LoginPage() {
  return (
    <AuthShell
      title="Ravi de vous revoir."
      description="Accédez à l’espace de confiance de votre organisation."
    >
      <LoginForm />
    </AuthShell>
  );
}
