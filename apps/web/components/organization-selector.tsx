"use client";

import { Building2, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiMutation } from "@/lib/api";
import { Button } from "./ui";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";
}

const roleLabels: Record<OrganizationMembership["role"], string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  ANALYST: "Analyste",
  VIEWER: "Lecteur"
};

export function OrganizationSelector({ memberships }: { memberships: OrganizationMembership[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const continueToWorkspace = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(undefined);
    const result = await apiMutation(`/organizations/${selectedId}/select`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setBusy(false);
    if (!result.ok) {
      setError("L’organisation n’a pas pu être sélectionnée. Votre espace n’a pas été ouvert.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="grid gap-5">
      <fieldset>
        <legend className="sr-only">Choisir une organisation</legend>
        <div className="grid gap-2">
          {memberships.map((membership) => (
            <label
              key={membership.organizationId}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left ${selectedId === membership.organizationId ? "border-brand-300 bg-brand-50 ring-1 ring-brand-100" : "border-mist-200 bg-white hover:bg-mist-50"}`}
            >
              <input
                type="radio"
                name="organization"
                value={membership.organizationId}
                checked={selectedId === membership.organizationId}
                onChange={() => setSelectedId(membership.organizationId)}
                className="sr-only"
              />
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                <Building2 className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink-950">
                  {membership.organizationName}
                </span>
                <span className="mt-1 block text-xs text-ink-600">
                  {roleLabels[membership.role]}
                </span>
              </span>
              <span
                className={`grid size-6 place-items-center rounded-full border ${selectedId === membership.organizationId ? "border-brand-600 bg-brand-600 text-white" : "border-mist-300 text-transparent"}`}
                aria-hidden="true"
              >
                <Check className="size-3.5" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
          {error}
        </p>
      )}
      <Button type="button" onClick={continueToWorkspace} disabled={!selectedId || busy}>
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        Continuer vers l’espace
      </Button>
      <p className="text-center text-xs leading-5 text-ink-600">
        Aucun espace n’est choisi automatiquement. Vous pourrez en changer depuis la navigation.
      </p>
    </div>
  );
}
