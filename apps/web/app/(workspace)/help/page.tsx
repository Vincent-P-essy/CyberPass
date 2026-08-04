import type { Metadata } from "next";
import { BookOpen, CircleHelp, FileQuestion, ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Centre d’aide" };
export default function HelpPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-7">
      <PageHeader
        eyebrow="Centre d’aide"
        title="Avancez avec des preuves fiables."
        description="Repères rapides pour utiliser l’espace de démonstration et préparer un déploiement connecté."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [
            BookOpen,
            "Bien démarrer",
            "Évaluez les contrôles puis rattachez une preuve datée à chacun."
          ],
          [
            FileQuestion,
            "Réviser une réponse",
            "Contrôlez les sources, corrigez le texte puis approuvez explicitement."
          ],
          [
            ShieldCheck,
            "Partager avec maîtrise",
            "Sélectionnez le périmètre et imposez toujours une expiration."
          ]
        ].map(([Icon, title, copy]) => {
          const C = Icon as typeof CircleHelp;
          return (
            <Card key={String(title)} className="p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <C className="size-5" />
              </span>
              <h2 className="mt-4 font-bold text-ink-950">{String(title)}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">{String(copy)}</p>
            </Card>
          );
        })}
      </div>
      <Card className="p-6">
        <h2 className="font-bold text-ink-950">Besoin d’assistance ?</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          La messagerie de support n’est pas activée dans ce MVP. Consultez la documentation du
          dépôt pour le démarrage, les variables d’environnement et les limites connues.
        </p>
      </Card>
    </div>
  );
}
