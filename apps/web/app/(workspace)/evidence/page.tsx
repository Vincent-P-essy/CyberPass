import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-server";
import { demoControls, demoEvidence } from "@/lib/demo-data";
import { EvidenceList } from "@/components/evidence-list";
import { ButtonLink, Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Coffre de preuves" };
export default async function EvidencePage() {
  const [result, controls] = await Promise.all([
    apiFetch("/evidences", demoEvidence),
    apiFetch("/controls", demoControls)
  ]);
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Coffre de preuves"
        title="Des preuves exploitables, pas une collection de fichiers."
        description="Conservez la source, la date, l’expiration, l’empreinte et la portée de chaque élément."
        actions={
          <ButtonLink href="/evidence/new">
            <Plus className="size-4" />
            Ajouter une preuve
          </ButtonLink>
        }
      />
      <DataSourceNotice source={result.source} message={result.message} />
      <Card className="overflow-hidden">
        <EvidenceList evidence={result.data} controls={controls.data} />
      </Card>
    </div>
  );
}
