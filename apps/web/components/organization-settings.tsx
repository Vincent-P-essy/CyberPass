"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiMutation } from "@/lib/api";
import { Button, Field, Input, SuccessMessage } from "./ui";

const orgSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom de l’organisation."),
  description: z.string().trim().max(2000, "La description ne peut pas dépasser 2 000 caractères.")
});
type OrgInput = z.infer<typeof orgSchema>;
const members = [
  {
    name: "Plessy Vincent",
    initials: "VP",
    email: "vincent@acme.example",
    role: "OWNER",
    status: "Actif"
  },
  {
    name: "Sophie Martin",
    initials: "SM",
    email: "sophie@acme.example",
    role: "ANALYST",
    status: "Actif"
  }
];

export interface SettingsOrganization {
  id: string;
  name: string;
  description?: string | null;
}

export function OrganizationSettings({
  organization,
  isDemo
}: {
  organization: SettingsOrganization;
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<"general" | "members">("general");
  const [message, setMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<OrgInput>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: organization.name, description: organization.description ?? "" }
  });
  const save = handleSubmit(async (values) => {
    const result = await apiMutation("/organizations/current", {
      method: "PATCH",
      body: JSON.stringify(values)
    });
    setMessage(result.message);
  });

  return (
    <div>
      <div className="flex gap-1 border-b border-mist-200 px-4 pt-2 sm:px-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "general"}
          onClick={() => setTab("general")}
          className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === "general" ? "border-brand-600 text-brand-700" : "border-transparent text-ink-600 hover:text-ink-950"}`}
        >
          Informations générales
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "members"}
          onClick={() => setTab("members")}
          className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === "members" ? "border-brand-600 text-brand-700" : "border-transparent text-ink-600 hover:text-ink-950"}`}
        >
          Membres & rôles
        </button>
      </div>
      {message && (
        <div className="mx-5 mt-5 sm:mx-6">
          <SuccessMessage>{message}</SuccessMessage>
        </div>
      )}
      {isDemo && (
        <div className="mx-5 mt-5 rounded-xl border border-amber-600/15 bg-amber-50 p-3 text-sm text-amber-600 sm:mx-6">
          Les modifications et invitations ne sont pas persistées en mode démonstration.
        </div>
      )}
      {tab === "general" ? (
        <form onSubmit={save} className="grid gap-6 p-5 sm:p-6" noValidate>
          <div>
            <h2 className="font-[740] tracking-[-0.02em] text-ink-950">
              Identité de l’organisation
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Ces informations peuvent apparaître sur les passeports partagés.
            </p>
          </div>
          <div className="grid gap-5">
            <Field label="Nom de l’organisation" error={errors.name?.message} required>
              <Input {...register("name")} />
            </Field>
            <Field
              label="Description"
              hint="2 000 caractères maximum. N’ajoutez pas d’information sensible."
              error={errors.description?.message}
            >
              <Input {...register("description")} />
            </Field>
          </div>
          <div className="rounded-xl bg-mist-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
              Identifiant public de l’organisation
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-sm text-ink-950">
                {organization.id}
              </code>
              <Button
                type="button"
                variant="ghost"
                className="min-h-8 px-2"
                aria-label="Copier l’identifiant"
                onClick={() => navigator.clipboard.writeText(organization.id)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end border-t border-mist-200 pt-5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-7 p-5 sm:p-6">
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-[740] tracking-[-0.02em] text-ink-950">Membres</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Les autorisations sont vérifiées côté serveur pour chaque organisation.
                </p>
              </div>
              {isDemo && <span className="text-xs font-bold text-ink-600">2 membres fictifs</span>}
            </div>
            {isDemo ? (
              <div className="mt-4 divide-y divide-mist-200 overflow-hidden rounded-xl border border-mist-200">
                {members.map((member) => (
                  <div key={member.email} className="flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-950">{member.name}</p>
                      <p className="truncate text-xs text-ink-600">{member.email}</p>
                    </div>
                    <span className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-bold text-ink-600">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-mist-200 bg-mist-50 p-4 text-sm leading-6 text-ink-600">
                <strong className="text-ink-950">
                  Liste des membres non disponible dans ce MVP.
                </strong>{" "}
                L’API permet les invitations et les changements de rôle ciblés, mais n’expose pas
                encore un annuaire complet.
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-amber-600/15 bg-amber-50 p-5">
            <h3 className="font-bold text-ink-950">Invitations non activées dans ce MVP</h3>
            <p className="mt-1 text-sm leading-6 text-amber-600">
              L’envoi, la remise du token et l’acceptation d’une invitation ne sont pas encore
              disponibles de bout en bout. Aucun faux e-mail ne sera simulé.
            </p>
          </section>
          <div className="flex items-start gap-3 rounded-xl bg-mist-50 p-4 text-xs leading-5 text-ink-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p>
              <strong>OWNER</strong> gère l’organisation et les rôles. <strong>ADMIN</strong>{" "}
              administre les ressources. <strong>ANALYST</strong> produit et révise.{" "}
              <strong>VIEWER</strong> consulte uniquement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
