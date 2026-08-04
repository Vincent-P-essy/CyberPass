import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, FileCheck2, History, Plus, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api-server";
import { demoControls, demoEvidence } from "@/lib/demo-data";
import { ControlUpdateForm } from "@/components/control-update-form";
import { ConfidentialityBadge, StatusBadge } from "@/components/status-badge";
import { ButtonLink, Card, DataSourceNotice } from "@/components/ui";
import type { Control } from "@/lib/types";

export const metadata: Metadata = { title: "Détail du contrôle" };
export default async function ControlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixture = demoControls.find((item) => item.id === id);
  const fallback: Control = fixture ?? {
    id,
    code: "",
    title: "",
    domain: "",
    description: "",
    status: "NOT_ASSESSED",
    evidenceCount: 0
  };
  let result;
  try {
    result = await apiFetch<Control>(`/controls/${id}`, fallback);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }
  if (result.source === "demo" && !fixture) notFound();
  const control = result.data;
  const evidenceResult = await apiFetch("/evidences", demoEvidence);
  const evidence = evidenceResult.data.filter((item) =>
    result.source === "api"
      ? evidenceResult.source === "api" && item.controlIds?.includes(control.id)
      : item.controlCodes.includes(control.code)
  );
  return (
    <div className="grid gap-7">
      <div>
        <Link
          href="/controls"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" />
          Retour aux contrôles
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-brand-600">
                {control.code}
              </span>
              <StatusBadge status={control.status} />
            </div>
            <h1 className="mt-3 text-balance text-3xl font-[760] leading-tight tracking-[-0.045em] text-ink-950 sm:text-4xl">
              {control.title}
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-ink-600">{control.description}</p>
          </div>
          <ButtonLink href={`/evidence/new?control=${control.id}`}>
            <Plus className="size-4" />
            Associer une preuve
          </ButtonLink>
        </div>
      </div>
      <DataSourceNotice source={result.source} message={result.message} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <div className="grid gap-6">
          <Card>
            <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-[740] tracking-[-0.02em]">Preuves associées</h2>
                <p className="mt-0.5 text-xs text-ink-600">
                  Éléments disponibles pour étayer ce contrôle
                </p>
              </div>
              <span className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-bold text-ink-600">
                {evidence.length}
              </span>
            </div>
            {evidence.length > 0 ? (
              <div className="divide-y divide-mist-200">
                {evidence.map((item) => (
                  <Link
                    href="/evidence"
                    key={item.id}
                    className="group flex items-center gap-4 px-5 py-4 hover:bg-mist-50 sm:px-6"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                      <FileCheck2 className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-950 group-hover:text-brand-700">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink-600">
                        Collectée le {item.collectedAt} · {item.source}
                      </span>
                    </span>
                    <ConfidentialityBadge level={item.confidentiality} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="font-bold text-ink-950">Aucune preuve associée</p>
                <p className="mt-1 text-sm text-ink-600">
                  Ajoutez un élément daté pour étayer ce contrôle.
                </p>
              </div>
            )}
          </Card>
          <Card>
            <div className="border-b border-mist-200 px-5 py-4 sm:px-6">
              <h2 className="font-[740] tracking-[-0.02em]">Traçabilité</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              {[
                [UserRound, "Responsable", control.owner ?? "Non assigné"],
                [Calendar, "Dernière revue", control.lastReviewed ?? "Jamais"],
                [History, "Cadence cible", "Trimestrielle"]
              ].map(([Icon, label, value]) => {
                const C = Icon as typeof UserRound;
                return (
                  <div key={String(label)} className="rounded-xl bg-mist-50 p-4">
                    <C className="size-4 text-brand-600" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-600">
                      {String(label)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink-950">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="font-[740] tracking-[-0.02em]">Mettre à jour le contrôle</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-ink-600">
            Documentez votre décision. Chaque modification est ajoutée au journal d’audit.
          </p>
          <ControlUpdateForm control={control} />
        </Card>
      </div>
    </div>
  );
}
