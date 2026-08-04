import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api-server";
import { demoControls } from "@/lib/demo-data";
import { EvidenceForm } from "@/components/evidence-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Ajouter une preuve" };
export default async function NewEvidencePage({
  searchParams
}: {
  searchParams: Promise<{ control?: string }>;
}) {
  const { control } = await searchParams;
  const controls = await apiFetch("/controls", demoControls);
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <Link
          href="/evidence"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" />
          Retour aux preuves
        </Link>
        <h1 className="text-3xl font-[760] tracking-[-0.045em] text-ink-950 sm:text-4xl">
          Ajouter une preuve
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-600">
          Qualifiez l’élément dès sa collecte pour qu’il reste vérifiable et partageable dans le bon
          périmètre.
        </p>
      </div>
      <Card className="p-5 sm:p-8">
        <EvidenceForm controls={controls.data} initialControlId={control} />
      </Card>
    </div>
  );
}
