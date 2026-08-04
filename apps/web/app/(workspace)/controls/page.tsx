import type { Metadata } from "next";
import { apiFetch } from "@/lib/api-server";
import { demoControls } from "@/lib/demo-data";
import { ControlsTable } from "@/components/controls-table";
import { Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Contrôles" };
export default async function ControlsPage() {
  const result = await apiFetch("/controls", demoControls);
  const verified = result.data.filter((item) => item.status === "VERIFIED").length;
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="CyberPass Starter Framework"
        title="Contrôles de sécurité"
        description={`${result.data.length} contrôles génériques pour structurer vos preuves. ${verified} ont fait l’objet d’une vérification tracée.`}
      />
      <DataSourceNotice source={result.source} message={result.message} />
      <Card className="overflow-hidden">
        <ControlsTable controls={result.data} />
      </Card>
      <p className="text-xs leading-5 text-ink-600">
        Le référentiel Starter est un jeu de démonstration CyberPass. Il ne constitue ni une
        intégration officielle ni une certification ISO 27001, NIS2 ou ReCyF.
      </p>
    </div>
  );
}
