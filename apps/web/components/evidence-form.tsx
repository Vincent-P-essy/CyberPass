"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, FileUp, LoaderCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { apiMutation, demoMode } from "@/lib/api";
import type { Control } from "@/lib/types";
import { Button, Field, Input, Select, SuccessMessage, Textarea } from "./ui";

const schema = z
  .object({
    title: z.string().trim().min(3, "Donnez un titre explicite à la preuve."),
    description: z.string().trim().min(10, "Précisez ce que cette preuve démontre."),
    type: z.enum([
      "DOCUMENT",
      "SCREENSHOT",
      "API_CHECK",
      "POLICY",
      "CERTIFICATE",
      "MANUAL_ATTESTATION",
      "LINK"
    ]),
    confidentiality: z.enum(["PUBLIC", "SHARED_SUMMARY", "CONFIDENTIAL", "RESTRICTED"]),
    source: z.string().trim().min(2, "Indiquez la provenance."),
    publicSummary: z.string().trim().optional(),
    collectedAt: z.string().min(1, "Indiquez la date de collecte."),
    expiresAt: z.string().optional(),
    controlId: z.string().min(1, "Associez au moins un contrôle.")
  })
  .superRefine((values, context) => {
    if (values.confidentiality === "SHARED_SUMMARY" && !values.publicSummary?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["publicSummary"],
        message: "Ajoutez le résumé requis pour un partage externe."
      });
    }
  });
type FormInput = z.infer<typeof schema>;

export function EvidenceForm({
  controls,
  initialControlId = ""
}: {
  controls: Control[];
  initialControlId?: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState<string>();
  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "DOCUMENT",
      confidentiality: "CONFIDENTIAL",
      collectedAt: today,
      controlId: initialControlId,
      publicSummary: ""
    }
  });
  const confidentiality = useWatch({ control, name: "confidentiality" });
  const onSubmit = handleSubmit(async (values) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setMessage("Le fichier dépasse la limite de 10 Mo.");
      return;
    }
    const form = new FormData();
    form.append("title", values.title);
    form.append("description", values.description);
    form.append("evidenceType", values.type);
    form.append("confidentiality", values.confidentiality);
    form.append("source", values.source);
    form.append("collectedAt", new Date(`${values.collectedAt}T00:00:00`).toISOString());
    form.append("controlIds", JSON.stringify([values.controlId]));
    if (values.publicSummary) form.append("publicSummary", values.publicSummary);
    if (values.expiresAt)
      form.append("expiresAt", new Date(`${values.expiresAt}T23:59:59`).toISOString());
    if (file) form.append("file", file, file.name);
    const result = await apiMutation("/evidences", { method: "POST", body: form });
    setMessage(result.message);
    if (result.ok && result.persisted) router.push("/evidence");
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      {message &&
        (message.includes("dépasse") ? (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
            {message}
          </p>
        ) : (
          <SuccessMessage>{message}</SuccessMessage>
        ))}
      {demoMode && (
        <div className="rounded-xl border border-amber-600/15 bg-amber-50 px-4 py-3 text-sm text-amber-600">
          <strong>Mode démonstration :</strong> le formulaire est fonctionnel, mais aucun fichier ne
          sera envoyé ni conservé tant que l’API n’est pas configurée.
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Titre de la preuve"
          error={errors.title?.message}
          className="sm:col-span-2"
          required
        >
          <Input placeholder="Ex. Export de couverture MFA — août 2026" {...register("title")} />
        </Field>
        <Field label="Type" required>
          <Select {...register("type")}>
            <option value="DOCUMENT">Document</option>
            <option value="SCREENSHOT">Capture d’écran</option>
            <option value="API_CHECK">Contrôle API</option>
            <option value="POLICY">Politique</option>
            <option value="CERTIFICATE">Certificat</option>
            <option value="MANUAL_ATTESTATION">Attestation manuelle</option>
            <option value="LINK">Lien</option>
          </Select>
        </Field>
        <Field label="Confidentialité" hint="Ce réglage reste modifiable." required>
          <Select {...register("confidentiality")}>
            <option value="PUBLIC">Public</option>
            <option value="SHARED_SUMMARY">Résumé partageable</option>
            <option value="CONFIDENTIAL">Confidentiel</option>
            <option value="RESTRICTED">Restreint</option>
          </Select>
        </Field>
      </div>
      <Field
        label="Description"
        hint="Décrivez le périmètre et les limites, sans secret ni donnée personnelle inutile."
        error={errors.description?.message}
        required
      >
        <Textarea placeholder="Cette preuve démontre…" {...register("description")} />
      </Field>
      {(confidentiality === "SHARED_SUMMARY" || confidentiality === "PUBLIC") && (
        <Field
          label="Résumé partageable"
          hint="Seul ce résumé pourra être présenté dans un passeport ; n’y placez aucun secret."
          error={errors.publicSummary?.message}
          required={confidentiality === "SHARED_SUMMARY"}
        >
          <Textarea
            placeholder="Résumé destiné au lecteur externe…"
            {...register("publicSummary")}
          />
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Source" error={errors.source?.message} required>
          <Input placeholder="Ex. Console d’identité" {...register("source")} />
        </Field>
        <Field label="Contrôle associé" error={errors.controlId?.message} required>
          <Select {...register("controlId")}>
            <option value="">Sélectionner un contrôle</option>
            {controls.map((control) => (
              <option value={control.id} key={control.id}>
                {control.code} — {control.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date de collecte" error={errors.collectedAt?.message} required>
          <span className="relative block">
            <Calendar className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
            <Input type="date" className="pl-10" {...register("collectedAt")} />
          </span>
        </Field>
        <Field label="Date d’expiration" hint="Optionnelle mais recommandée.">
          <Input type="date" {...register("expiresAt")} />
        </Field>
      </div>
      <Field
        label="Fichier"
        hint="PDF, image, CSV, XLSX ou texte — 10 Mo maximum. Le serveur valide le type réel et calcule le hash SHA-256."
      >
        <span className="relative flex min-h-28 items-center rounded-2xl border border-dashed border-mist-300 bg-mist-50 p-4 hover:border-brand-300">
          <FileUp className="mr-3 size-6 shrink-0 text-brand-600" />
          <Input
            className="border-0 bg-transparent p-0 shadow-none file:cursor-pointer focus:ring-0"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
        </span>
      </Field>
      <div className="flex items-start gap-3 rounded-xl bg-mist-50 p-4 text-xs leading-5 text-ink-600">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <p>
          Les fichiers privés ne sont jamais publiés directement. Les noms sont assainis côté
          serveur et les téléchargements passent par des URLs temporaires autorisées.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-mist-200 pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}Ajouter la preuve
        </Button>
      </div>
    </form>
  );
}
