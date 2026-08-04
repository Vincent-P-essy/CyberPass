import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "./logo";

const benefits = [
  "Des preuves datées, traçables et reliées aux contrôles",
  "Des réponses toujours soumises à une validation humaine",
  "Un partage limité aux informations explicitement autorisées"
];

export function AuthShell({
  children,
  title,
  description
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[minmax(380px,0.88fr)_minmax(540px,1.12fr)]">
      <section className="relative hidden overflow-hidden bg-ink-950 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="absolute -left-24 top-1/3 size-80 rounded-full border border-white/[.05]" />
        <div className="absolute -left-5 top-[41%] size-44 rounded-full border border-white/[.06]" />
        <div className="absolute bottom-0 right-0 h-64 w-72 bg-[radial-gradient(circle_at_bottom_right,rgba(22,125,100,.45),transparent_65%)]" />
        <Logo inverse />
        <div className="relative my-auto max-w-lg py-14">
          <span className="mb-6 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.07] text-[#d7f36a]">
            <ShieldCheck className="size-6" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7f36a]">
            Prove once. Sell everywhere.
          </p>
          <h2 className="mt-4 text-balance text-[clamp(2rem,4vw,3.75rem)] font-[760] leading-[1.03] tracking-[-0.055em]">
            Votre sécurité devient une preuve de confiance.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/60">
            Centralisez vos éléments de preuve, répondez plus vite aux évaluations et gardez la
            maîtrise de ce que vous partagez.
          </p>
          <ul className="mt-9 grid gap-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-white/76">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-200" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/35">
          CyberPass fournit un espace de preuve. Il ne constitue pas une certification.
        </p>
      </section>
      <section className="flex min-h-dvh items-center justify-center bg-mist-50 px-5 py-10 sm:px-10">
        <div className="w-full max-w-[450px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            Espace sécurisé
          </p>
          <h1 className="text-balance text-3xl font-[760] tracking-[-0.045em] text-ink-950 sm:text-[2.15rem]">
            {title}
          </h1>
          <p className="mt-2.5 text-[15px] leading-6 text-ink-600">{description}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-xs leading-5 text-ink-600">
            Les sessions connectées sont protégées par des cookies sécurisés et une validation CSRF.
          </p>
        </div>
      </section>
    </main>
  );
}
