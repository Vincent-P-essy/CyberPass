"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, ChevronRight, LoaderCircle, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiMutation, demoMode } from "@/lib/api";
import { Button, Field, Input, Select } from "./ui";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom de l’organisation."),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\//.test(value),
      "Commencez l’adresse par https://"
    ),
  country: z.string().min(2),
  companySize: z.string().min(1, "Sélectionnez une tranche d’effectif."),
  role: z.string().min(1, "Sélectionnez votre rôle.")
});
type FormInput = z.infer<typeof schema>;

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { country: "FR", website: "" }
  });
  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await apiMutation("/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: values.name,
        description: [values.website, values.country, values.companySize, values.role]
          .filter(Boolean)
          .join(" · ")
      })
    });
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/dashboard");
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      {demoMode && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <strong>Mode démonstration :</strong> vous pouvez parcourir cette étape, mais
          l’organisation ne sera pas persistée sans API.
        </div>
      )}
      {serverError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
          {serverError}
        </p>
      )}
      <Field label="Nom de l’organisation" error={errors.name?.message} required>
        <span className="relative block">
          <Building2 className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            className="pl-10"
            placeholder="Ex. Acme Cloud Europe"
            autoComplete="organization"
            {...register("name")}
          />
        </span>
      </Field>
      <Field
        label="Site web"
        hint="Optionnel. Utilisé uniquement pour identifier votre organisation."
        error={errors.website?.message}
      >
        <Input type="url" placeholder="https://entreprise.fr" {...register("website")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pays principal" required>
          <Select {...register("country")}>
            <option value="FR">France</option>
            <option value="BE">Belgique</option>
            <option value="LU">Luxembourg</option>
            <option value="CH">Suisse</option>
            <option value="DE">Allemagne</option>
            <option value="ES">Espagne</option>
            <option value="OTHER">Autre</option>
          </Select>
        </Field>
        <Field label="Effectif" error={errors.companySize?.message} required>
          <Select defaultValue="" {...register("companySize")}>
            <option value="" disabled>
              Sélectionner
            </option>
            <option value="1-19">1 à 19</option>
            <option value="20-49">20 à 49</option>
            <option value="50-249">50 à 249</option>
            <option value="250+">250 et plus</option>
          </Select>
        </Field>
      </div>
      <Field label="Votre rôle" error={errors.role?.message} required>
        <span className="relative block">
          <UsersRound className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Select className="pl-10" defaultValue="" {...register("role")}>
            <option value="" disabled>
              Sélectionner votre fonction
            </option>
            <option value="security">Sécurité / RSSI</option>
            <option value="it">IT / Infrastructure</option>
            <option value="engineering">Engineering / Produit</option>
            <option value="legal">Juridique / Conformité</option>
            <option value="leadership">Direction</option>
            <option value="other">Autre</option>
          </Select>
        </span>
      </Field>
      <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Créer l’espace de l’organisation
        <ChevronRight className="size-4" />
      </Button>
      <p className="text-center text-xs leading-5 text-ink-600">
        Vous en serez propriétaire. Les rôles et invitations pourront être gérés dans les
        paramètres.
      </p>
    </form>
  );
}
