"use client";

import {
  CalendarDays,
  Check,
  Clipboard,
  Clock3,
  Eye,
  FileCheck2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apiMutation, demoMode } from "@/lib/api";
import type { Control, Evidence } from "@/lib/types";
import { ConfidentialityBadge, StatusBadge } from "./status-badge";
import { Button, Field, Input, SuccessMessage } from "./ui";

type CreatedShare = { id?: string; token?: string; publicUrl?: string };

export function PassportForm({
  controls,
  evidence
}: {
  controls: Control[];
  evidence: Evidence[];
}) {
  const shareable = controls.filter(
    (item) => item.status === "IMPLEMENTED" || item.status === "VERIFIED"
  );
  const [selected, setSelected] = useState<string[]>(shareable.slice(0, 4).map((item) => item.id));
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const [label, setLabel] = useState("Partage client — août 2026");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ url: string; id?: string }>();
  const [message, setMessage] = useState<string>();
  const [revoked, setRevoked] = useState(false);
  const selectedControls = useMemo(
    () => controls.filter((item) => selected.includes(item.id)),
    [controls, selected]
  );
  const shareableEvidence = useMemo(() => {
    const selectedCodes = new Set(selectedControls.map((control) => control.code));
    return evidence.filter(
      (item) =>
        (item.confidentiality === "PUBLIC" || item.confidentiality === "SHARED_SUMMARY") &&
        (item.controlIds?.some((controlId) => selected.includes(controlId)) ||
          item.controlCodes.some((code) => selectedCodes.has(code)))
    );
  }, [evidence, selected, selectedControls]);

  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  const toggleEvidence = (id: string) =>
    setSelectedEvidence((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  const create = async () => {
    setMessage(undefined);
    if (!label.trim() || selected.length === 0 || !expiresAt) {
      setMessage("Renseignez un libellé, une expiration et au moins un contrôle.");
      return;
    }
    setBusy(true);
    const allowedEvidenceIds = selectedEvidence.filter((id) =>
      shareableEvidence.some((item) => item.id === id)
    );
    const expiration = new Date(`${expiresAt}T23:59:59`).toISOString();
    const result = await apiMutation<CreatedShare>("/share-links", {
      method: "POST",
      body: JSON.stringify({
        title: label,
        expiresAt: expiration,
        controlIds: selected,
        evidenceIds: allowedEvidenceIds
      })
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    const url = result.data?.token
      ? `${window.location.origin}/p/${result.data.token}`
      : `${window.location.origin}/p/demo-access-2026`;
    setCreated({ url, id: result.data?.id });
    setMessage(result.message);
  };
  const revoke = async () => {
    if (!created) return;
    setBusy(true);
    const result = await apiMutation(`/share-links/${created.id ?? "demo-share"}/revoke`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setBusy(false);
    if (result.ok) setRevoked(true);
    setMessage(result.message);
  };

  if (created)
    return (
      <div className="grid gap-6">
        <div className="grid place-items-center py-2 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <ShieldCheck className="size-7" />
          </span>
          <h2 className="mt-4 text-2xl font-[760] tracking-[-0.035em] text-ink-950">
            {revoked ? "Lien révoqué" : "Passeport prêt à partager"}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
            {revoked
              ? "Ce lien ne doit plus donner accès au passeport dès que l’API confirme la révocation."
              : "Le token complet n’est présenté qu’à la création. Transmettez-le par un canal adapté."}
          </p>
        </div>
        {message && <SuccessMessage>{message}</SuccessMessage>}
        <div
          className={`rounded-2xl border p-5 ${revoked ? "border-rose-600/20 bg-rose-50" : "border-brand-200 bg-brand-50"}`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
            Lien de consultation
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-white px-4 py-3 text-sm text-ink-950 ring-1 ring-mist-200">
              {created.url}
            </code>
            <Button
              type="button"
              variant="secondary"
              disabled={revoked}
              onClick={() => navigator.clipboard.writeText(created.url)}
            >
              <Clipboard className="size-4" />
              Copier
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Expire le {expiresAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" />
              {selected.length} contrôles autorisés
            </span>
          </div>
        </div>
        {demoMode && (
          <div className="rounded-xl border border-amber-600/15 bg-amber-50 p-3 text-sm text-amber-600">
            <strong>Lien de démonstration uniquement.</strong> Il est public dans cet environnement
            et ne représente pas un partage persistant.
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="danger" onClick={revoke} disabled={busy || revoked}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}Révoquer le lien
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreated(undefined);
                setRevoked(false);
                setMessage(undefined);
              }}
            >
              <RotateCcw className="size-4" />
              Créer un autre
            </Button>
            {!revoked && (
              <Link
                href={created.url.replace(window.location.origin, "")}
                target="_blank"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                <Eye className="size-4" />
                Ouvrir le passeport
              </Link>
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div className="grid gap-7">
      {message && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
          {message}
        </p>
      )}
      {demoMode && (
        <div className="rounded-xl border border-amber-600/15 bg-amber-50 p-3 text-sm text-amber-600">
          <strong>Mode démonstration :</strong> la création produira un lien d’aperçu non persistant
          clairement identifié.
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Libellé interne" hint="Non visible par les visiteurs." required>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="Date d’expiration" hint="30 jours recommandés." required>
          <span className="relative block">
            <Clock3 className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
            <Input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              className="pl-10"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </span>
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-ink-950">
          Contrôles à partager <span className="text-rose-600">*</span>
        </legend>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          Seuls les contrôles sélectionnés apparaîtront. Les fichiers confidentiels et détails
          techniques restent masqués.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {shareable.map((control) => (
            <label
              key={control.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected.includes(control.id) ? "border-brand-300 bg-brand-50 ring-1 ring-brand-100" : "border-mist-200 hover:bg-mist-50"}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(control.id)}
                onChange={() => toggle(control.id)}
                className="mt-0.5 size-4 shrink-0 accent-brand-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-brand-600">{control.code}</span>
                <span className="mt-1 block text-sm font-bold text-ink-950">{control.title}</span>
                <span className="mt-2 block">
                  <StatusBadge status={control.status} />
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold text-ink-950">Résumés de preuves à partager</legend>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          Sélection explicite uniquement. Les preuves confidentielles et restreintes sont toujours
          exclues.
        </p>
        {shareableEvidence.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {shareableEvidence.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selectedEvidence.includes(item.id) ? "border-brand-300 bg-brand-50 ring-1 ring-brand-100" : "border-mist-200 hover:bg-mist-50"}`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvidence.includes(item.id)}
                  onChange={() => toggleEvidence(item.id)}
                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-950">{item.title}</span>
                  <span className="mt-1 block text-xs text-ink-600">
                    {item.source} · collectée le {item.collectedAt}
                  </span>
                </span>
                <ConfidentialityBadge level={item.confidentiality} />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-mist-50 p-4 text-sm leading-6 text-ink-600">
            Aucune preuve publique ou avec résumé partageable n’est liée aux contrôles sélectionnés.
            Le passeport peut être créé sans résumé.
          </div>
        )}
      </fieldset>
      <div className="rounded-2xl bg-ink-950 p-5 text-white">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-[#d7f36a]" />
          <h3 className="text-sm font-bold">Aperçu du périmètre</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-[760]">{selected.length}</p>
            <p className="mt-1 text-xs text-white/55">Contrôles</p>
          </div>
          <div>
            <p className="text-2xl font-[760]">
              {
                selectedEvidence.filter((id) => shareableEvidence.some((item) => item.id === id))
                  .length
              }
            </p>
            <p className="mt-1 text-xs text-white/55">Résumés sélectionnés</p>
          </div>
          <div>
            <p className="text-2xl font-[760]">0</p>
            <p className="mt-1 text-xs text-white/55">Fichier privé exposé</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-mist-200 pt-6">
        <Button type="button" onClick={create} disabled={busy || selected.length === 0}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          Créer le lien limité
        </Button>
      </div>
    </div>
  );
}
