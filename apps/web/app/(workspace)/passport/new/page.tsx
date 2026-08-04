import type { Metadata } from "next";
import { apiFetch } from "@/lib/api-server";
import { demoControls, demoEvidence } from "@/lib/demo-data";
import { PassportForm } from "@/components/passport-form";
import { Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Créer un passeport cyber" };
export default async function NewPassportPage() {
  const [controls, evidence] = await Promise.all([
    apiFetch("/controls", demoControls),
    apiFetch("/evidences", demoEvidence)
  ]);
  return (
    <div className="mx-auto grid max-w-5xl gap-7">
      <PageHeader
        eyebrow="Partage externe"
        title="Créez un passeport cyber maîtrisé."
        description="Choisissez précisément les contrôles visibles et une date d’expiration. Rien d’autre ne sera exposé."
      />
      <DataSourceNotice source={controls.source} message={controls.message} />
      <Card className="p-5 sm:p-8">
        <PassportForm controls={controls.data} evidence={evidence.data} />
      </Card>
      <p className="text-xs leading-5 text-ink-600">
        Un passeport CyberPass présente des informations déclarées et des preuves sélectionnées. Il
        ne constitue ni une certification ni une garantie de conformité juridique.
      </p>
    </div>
  );
}
