import type { Metadata } from "next";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  ShieldCheck
} from "lucide-react";
import { demoMode } from "@/lib/api";
import { publicApiFetch } from "@/lib/api-server";
import type { PublicPassport } from "@/lib/types";
import { Logo } from "@/components/logo";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "Passeport cyber partagé",
  robots: { index: false, follow: false }
};

const demoPassport: PublicPassport = {
  organization: { name: "Acme Cloud Europe", website: "https://example.com", country: "France" },
  updatedAt: "4 août 2026 à 10:42",
  expiresAt: "3 septembre 2026 à 23:59",
  controls: [
    {
      id: "mfa",
      code: "CP-ACC-01",
      title: "MFA des comptes administrateurs",
      domain: "Identités et accès",
      status: "VERIFIED",
      lastVerified: "18 juillet 2026",
      expiresAt: "18 octobre 2026",
      evidenceSummaries: [
        {
          title: "Couverture MFA",
          summary: "Revue de couverture datée, détails confidentiels masqués.",
          collectedAt: "18 juillet 2026"
        }
      ]
    },
    {
      id: "backup",
      code: "CP-RES-01",
      title: "Sauvegardes régulières",
      domain: "Résilience",
      status: "VERIFIED",
      lastVerified: "23 juillet 2026",
      expiresAt: "23 octobre 2026",
      evidenceSummaries: [
        {
          title: "Rapport de sauvegarde",
          summary: "Résumé partageable du rapport trimestriel.",
          collectedAt: "23 juillet 2026"
        }
      ]
    },
    {
      id: "repo",
      code: "CP-SDL-01",
      title: "Protection des dépôts de code",
      domain: "Développement sécurisé",
      status: "VERIFIED",
      lastVerified: "25 juillet 2026",
      expiresAt: "25 août 2026",
      evidenceSummaries: [
        {
          title: "Configuration de protection",
          summary: "Contrôle de configuration réalisé ; paramètres techniques masqués.",
          collectedAt: "25 juillet 2026"
        }
      ]
    },
    {
      id: "incident",
      code: "CP-IR-01",
      title: "Réponse aux incidents",
      domain: "Gestion des incidents",
      status: "IMPLEMENTED",
      lastVerified: "29 juin 2026",
      evidenceSummaries: [
        {
          title: "Politique de réponse aux incidents",
          summary: "Une politique documentée définit les rôles et l’escalade.",
          collectedAt: "29 juin 2026"
        }
      ]
    }
  ]
};

export default async function PublicPassportPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const passport = demoMode
    ? token === "demo-access-2026"
      ? demoPassport
      : null
    : await publicApiFetch<PublicPassport>(`/public/passports/${encodeURIComponent(token)}`);
  if (!passport)
    return (
      <main className="grid min-h-dvh place-items-center bg-mist-50 px-5">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mist-100 text-ink-600">
            <Clock3 className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-[760] tracking-[-0.035em] text-ink-950">
            Passeport indisponible
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Ce lien est invalide, expiré, révoqué, ou sa vérification est temporairement impossible.
            Aucune information n’a été affichée.
          </p>
        </div>
      </main>
    );
  return (
    <main className="min-h-dvh bg-mist-50">
      <header className="border-b border-mist-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
            <ShieldCheck className="size-3.5" />
            Partage vérifié
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {demoMode && (
          <div className="mb-6 rounded-xl border border-amber-600/15 bg-amber-50 p-3 text-sm text-amber-600">
            <strong>Passeport de démonstration.</strong> Ces informations sont fictives et ne
            constituent pas une attestation réelle.
          </div>
        )}
        <section className="overflow-hidden rounded-3xl bg-ink-950 text-white shadow-card">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d7f36a]">
                Passeport cyber partagé
              </p>
              <h1 className="mt-4 text-balance text-4xl font-[760] tracking-[-0.05em] sm:text-5xl">
                {passport.organization.name}
              </h1>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
                {passport.organization.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="size-4" />
                    {passport.organization.country}
                  </span>
                )}
                {passport.organization.website && (
                  <a
                    href={passport.organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white"
                  >
                    <ExternalLink className="size-4" />
                    Site de l’organisation
                  </a>
                )}
              </div>
            </div>
            <div className="grid gap-2 text-xs text-white/60 lg:text-right">
              <span className="inline-flex items-center gap-2 lg:justify-end">
                <CheckCircle2 className="size-4 text-brand-200" />
                Mis à jour le {passport.updatedAt}
              </span>
              <span className="inline-flex items-center gap-2 lg:justify-end">
                <CalendarDays className="size-4 text-[#d7f36a]" />
                Expire le {passport.expiresAt}
              </span>
            </div>
          </div>
        </section>
        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-brand-600">
                Périmètre autorisé
              </p>
              <h2 className="mt-1 text-2xl font-[760] tracking-[-0.035em] text-ink-950">
                {passport.controls.length} contrôles partagés
              </h2>
            </div>
            <p className="text-xs text-ink-600">Les informations confidentielles sont exclues.</p>
          </div>
          <div className="mt-5 grid gap-4">
            {passport.controls.map((control) => (
              <article
                key={control.id}
                className="rounded-2xl border border-mist-200 bg-white p-5 shadow-card sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-brand-600">{control.code}</span>
                      <span className="text-xs text-ink-600">{control.domain}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-[740] tracking-[-0.025em] text-ink-950">
                      {control.title}
                    </h3>
                  </div>
                  <StatusBadge status={control.status} />
                </div>
                <div className="mt-5 grid gap-3 border-t border-mist-200 pt-5 sm:grid-cols-[180px_1fr]">
                  <div className="text-xs leading-5 text-ink-600">
                    <p>
                      <strong className="text-ink-800">Dernière vérification</strong>
                      <br />
                      {control.lastVerified ?? "Non renseignée"}
                    </p>
                    {control.expiresAt && (
                      <p className="mt-2">
                        <strong className="text-ink-800">Validité de la preuve</strong>
                        <br />
                        Jusqu’au {control.expiresAt}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {control.evidenceSummaries.map((evidence) => (
                      <div
                        key={evidence.title}
                        className="flex items-start gap-3 rounded-xl bg-mist-50 p-3"
                      >
                        <FileCheck2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                        <div>
                          <p className="text-sm font-bold text-ink-950">{evidence.title}</p>
                          <p className="mt-1 text-xs leading-5 text-ink-600">
                            {evidence.summary} · Collectée le {evidence.collectedAt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <footer className="mt-10 rounded-2xl border border-mist-200 bg-white p-5 text-xs leading-5 text-ink-600">
          <p className="font-bold text-ink-950">Avertissement important</p>
          <p className="mt-1">
            CyberPass organise et partage des informations déclarées par l’organisation. Ce
            passeport ne constitue pas une certification, un audit indépendant, ni une garantie de
            conformité juridique ou de sécurité absolue.
          </p>
        </footer>
      </div>
    </main>
  );
}
