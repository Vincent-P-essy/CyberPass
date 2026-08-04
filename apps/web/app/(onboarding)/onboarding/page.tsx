import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = { title: "Créer votre organisation" };

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-mist-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600">
            Étape 1 sur 2
          </span>
        </header>
        <div className="mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:gap-20">
          <section className="pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              Votre espace de confiance
            </p>
            <h1 className="mt-3 text-balance text-4xl font-[760] leading-[1.08] tracking-[-0.05em] text-ink-950 sm:text-5xl">
              Commençons par votre organisation.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-600">
              Les contrôles, preuves et questionnaires seront strictement rattachés à cet espace.
              Vous pourrez inviter votre équipe ensuite.
            </p>
            <div className="mt-10 grid gap-4">
              {[
                [
                  "01",
                  "Identifiez votre organisation",
                  "Quelques informations générales, sans donnée sensible."
                ],
                [
                  "02",
                  "Chargez le référentiel Starter",
                  "15 contrôles de démonstration, clairement identifiés comme tels."
                ],
                [
                  "03",
                  "Collectez votre première preuve",
                  "Vous gardez le contrôle de sa confidentialité et de son partage."
                ]
              ].map(([number, title, copy], index) => (
                <div key={number} className="flex gap-4">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${index === 0 ? "bg-brand-600 text-white" : "border border-mist-200 bg-white text-ink-600"}`}
                  >
                    {number}
                  </span>
                  <div>
                    <p className="font-bold text-ink-950">{title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-ink-600">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-700">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" />
              <p>
                <strong>Isolation par organisation.</strong> L’API vérifie l’appartenance et le rôle
                pour chaque ressource.
              </p>
            </div>
          </section>
          <section className="rounded-3xl border border-mist-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-[740] tracking-[-0.03em] text-ink-950">
              Informations générales
            </h2>
            <p className="mb-7 mt-1 text-sm text-ink-600">
              Vous pourrez les modifier à tout moment.
            </p>
            <OnboardingForm />
          </section>
        </div>
      </div>
    </main>
  );
}
