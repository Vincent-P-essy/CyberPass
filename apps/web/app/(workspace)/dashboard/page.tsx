import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileQuestion,
  Plus,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { apiFetch } from "@/lib/api-server";
import { demoAudit, demoControls, demoDashboard, demoEvidence } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink, Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Vue d’ensemble" };

const activityIcons = [ClipboardCheck, FileCheck2, ShieldCheck, FileQuestion];

export default async function DashboardPage() {
  const [result, controlsResult, evidenceResult, auditResult] = await Promise.all([
    apiFetch("/dashboard", demoDashboard),
    apiFetch("/controls", demoControls),
    apiFetch("/evidences", demoEvidence),
    apiFetch("/audit-events", demoAudit)
  ]);
  const data = result.data;
  const completion = Math.round((data.assessedControls / data.totalControls) * 100);
  const showFallbackLists = result.source === "demo";
  const evidence = evidenceResult.source === "api" || showFallbackLists ? evidenceResult.data : [];
  const controls = controlsResult.source === "api" || showFallbackLists ? controlsResult.data : [];
  const activities = auditResult.source === "api" || showFallbackLists ? auditResult.data : [];
  const expiring = evidence.filter((item) => item.expiresAt).slice(0, 3);
  const attention = controls
    .filter(
      (item) =>
        item.status === "PARTIAL" ||
        item.status === "NOT_IMPLEMENTED" ||
        item.status === "NOT_ASSESSED"
    )
    .slice(0, 4);

  return (
    <div className="grid gap-7 lg:gap-8">
      <PageHeader
        eyebrow="Mardi 4 août 2026"
        title="Bonjour Vincent, votre espace est à jour."
        description="Suivez l’avancement documentaire et les éléments qui nécessitent votre attention — sans score de sécurité artificiel."
        actions={
          <>
            <ButtonLink href="/evidence/new" variant="secondary">
              <Plus className="size-4" />
              Ajouter une preuve
            </ButtonLink>
            <ButtonLink href="/questionnaires/import">
              <Sparkles className="size-4" />
              Importer un questionnaire
            </ButtonLink>
          </>
        }
      />
      <DataSourceNotice source={result.source} message={result.message} />

      <section
        aria-labelledby="overview-metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <h2 id="overview-metrics" className="sr-only">
          Indicateurs de suivi
        </h2>
        <Card className="flex items-center gap-4 p-5 sm:col-span-2 xl:col-span-1">
          <div
            className="relative grid size-[72px] shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(#167d64 ${completion * 3.6}deg, #dce7e2 0)` }}
          >
            <span className="grid size-[58px] place-items-center rounded-full bg-white text-lg font-[760] text-ink-950">
              {completion}%
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-600">Complétion</p>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {data.assessedControls} sur {data.totalControls} contrôles évalués
            </p>
          </div>
        </Card>
        {[
          {
            label: "Contrôles vérifiés",
            value: data.verifiedControls,
            note: "Revue tracée",
            icon: CheckCircle2,
            tone: "bg-brand-100 text-brand-700"
          },
          {
            label: "Preuves à renouveler",
            value: data.expiringEvidence,
            note: "Sous 30 jours",
            icon: CalendarClock,
            tone: "bg-amber-50 text-amber-600"
          },
          {
            label: "Réponses à valider",
            value: data.pendingReviews,
            note: "Revue humaine",
            icon: FileQuestion,
            tone: "bg-[#e9f3ff] text-[#21629b]"
          },
          {
            label: "Passeports actifs",
            value: data.activePassports,
            note: "Partage limité",
            icon: ShieldCheck,
            tone: "bg-[#f1edff] text-[#6552a3]"
          }
        ].map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-5" />
            </div>
            <p className="mt-5 text-3xl font-[760] tracking-[-0.045em] text-ink-950">{value}</p>
            <p className="mt-1 text-sm font-bold text-ink-800">{label}</p>
            <p className="mt-0.5 text-xs text-ink-600">{note}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.7fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-[740] tracking-[-0.02em] text-ink-950">À traiter en priorité</h2>
              <p className="mt-0.5 text-xs text-ink-600">D’après les informations renseignées</p>
            </div>
            <Link
              href="/controls"
              className="text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Voir les contrôles
            </Link>
          </div>
          <div className="divide-y divide-mist-200">
            {attention.map((control) => (
              <Link
                key={control.id}
                href={`/controls/${control.id}`}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-mist-50 sm:px-6"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist-100 text-xs font-extrabold text-ink-600">
                  {control.code.slice(-2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-950 group-hover:text-brand-700">
                    {control.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-600">
                    {control.domain} · {control.evidenceCount} preuve
                    {control.evidenceCount > 1 ? "s" : ""}
                  </span>
                </span>
                <StatusBadge status={control.status} />
                <ArrowRight className="hidden size-4 text-mist-300 group-hover:text-brand-600 sm:block" />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="border-b border-mist-200 px-5 py-4 sm:px-6">
            <h2 className="font-[740] tracking-[-0.02em] text-ink-950">Prochaines expirations</h2>
            <p className="mt-0.5 text-xs text-ink-600">Planifiez les renouvellements</p>
          </div>
          <div className="grid gap-1 p-3">
            {expiring.map((item, index) => (
              <Link
                href="/evidence"
                key={item.id}
                className="flex items-start gap-3 rounded-xl p-3 hover:bg-mist-50"
              >
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${index === 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}
                >
                  <CalendarClock className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-bold leading-5 text-ink-950">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs text-ink-600">
                    Expire le {item.expiresAt}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mx-5 mb-5 rounded-xl bg-mist-50 p-3 text-xs leading-5 text-ink-600">
            Les alertes sont informatives. Vérifiez la date et la portée de chaque preuve avant
            renouvellement.
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-[740] tracking-[-0.02em] text-ink-950">Activité récente</h2>
            <p className="mt-0.5 text-xs text-ink-600">Événements importants de l’organisation</p>
          </div>
          <Link href="/audit" className="text-sm font-bold text-brand-600">
            Journal complet
          </Link>
        </div>
        <div className="grid divide-y divide-mist-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {[activities.slice(0, 3), activities.slice(3, 6)].map((group, groupIndex) => (
            <div key={groupIndex} className="divide-y divide-mist-200">
              {group.map((event, index) => {
                const Icon =
                  activityIcons[(groupIndex * 3 + index) % activityIcons.length] ?? ClipboardCheck;
                return (
                  <div key={event.id} className="flex gap-3 px-5 py-4 sm:px-6">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-950">{event.detail}</p>
                      <p className="mt-1 text-xs text-ink-600">
                        {event.actor} · {event.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
