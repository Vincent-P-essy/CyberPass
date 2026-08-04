import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  OrganizationSelector,
  type OrganizationMembership
} from "@/components/organization-selector";
import { ApiRequestError, apiFetch } from "@/lib/api-server";

export const metadata: Metadata = { title: "Choisir une organisation" };
export const dynamic = "force-dynamic";

interface MeWithMemberships {
  id: string;
  fullName: string;
  email: string;
  memberships: OrganizationMembership[];
}

export default async function SelectOrganizationPage() {
  let me;
  try {
    me = await apiFetch<MeWithMemberships>("/auth/me", {
      id: "demo-vincent",
      fullName: "Plessy Vincent",
      email: "vincent@acme.example",
      memberships: [
        {
          organizationId: "demo-acme",
          organizationName: "Acme Cloud Europe",
          role: "OWNER"
        }
      ]
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) redirect("/login");
    throw error;
  }

  if (me.data.memberships.length === 0) redirect("/onboarding");

  return (
    <main className="min-h-dvh bg-mist-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-lg">
        <Logo />
        <section className="mt-12 rounded-3xl border border-mist-200 bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            Espace de travail
          </p>
          <h1 className="mt-3 text-3xl font-[760] tracking-[-0.045em] text-ink-950">
            Choisissez votre organisation.
          </h1>
          <p className="mb-7 mt-2 text-sm leading-6 text-ink-600">
            Votre compte appartient à plusieurs espaces. Cette sélection détermine le périmètre des
            données et autorisations.
          </p>
          <OrganizationSelector memberships={me.data.memberships} />
        </section>
      </div>
    </main>
  );
}
