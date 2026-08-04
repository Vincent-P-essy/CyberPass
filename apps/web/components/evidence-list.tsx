"use client";

import { CalendarClock, FileCheck2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Control, Evidence } from "@/lib/types";
import { ConfidentialityBadge } from "./status-badge";
import { Input, Select } from "./ui";

const typeLabels: Record<Evidence["type"], string> = {
  DOCUMENT: "Document",
  SCREENSHOT: "Capture",
  API_CHECK: "Contrôle API",
  POLICY: "Politique",
  CERTIFICATE: "Certificat",
  MANUAL_ATTESTATION: "Attestation",
  LINK: "Lien"
};

export function EvidenceList({
  evidence,
  controls
}: {
  evidence: Evidence[];
  controls: Control[];
}) {
  const [query, setQuery] = useState("");
  const [confidentiality, setConfidentiality] = useState("ALL");
  const filtered = useMemo(
    () =>
      evidence.filter(
        (item) =>
          `${item.title} ${item.source} ${item.controlCodes.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (confidentiality === "ALL" || item.confidentiality === confidentiality)
      ),
    [confidentiality, evidence, query]
  );
  const linkedCodes = (item: Evidence) => {
    if (item.controlIds?.length) {
      return item.controlIds.map(
        (id) =>
          controls.find((control) => control.id === id)?.code ?? `Identifiant ${id.slice(0, 8)}…`
      );
    }
    return item.controlCodes;
  };
  return (
    <div>
      <div className="grid gap-3 border-b border-mist-200 p-4 sm:grid-cols-[1fr_230px] sm:p-5">
        <label className="relative">
          <span className="sr-only">Rechercher une preuve</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            className="pl-10"
            placeholder="Rechercher une preuve, une source, un contrôle…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par confidentialité</span>
          <Select
            value={confidentiality}
            onChange={(event) => setConfidentiality(event.target.value)}
          >
            <option value="ALL">Toutes les visibilités</option>
            <option value="PUBLIC">Public</option>
            <option value="SHARED_SUMMARY">Résumé partageable</option>
            <option value="CONFIDENTIAL">Confidentiel</option>
            <option value="RESTRICTED">Restreint</option>
          </Select>
        </label>
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-50/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-600">
              <th className="px-6 py-3.5">Preuve</th>
              <th className="px-4 py-3.5">Visibilité</th>
              <th className="px-4 py-3.5">Contrôles</th>
              <th className="px-4 py-3.5">Collectée</th>
              <th className="px-4 py-3.5">Expiration</th>
              <th className="px-4 py-3.5">Propriétaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-200">
            {filtered.map((item) => (
              <tr key={item.id} className="group hover:bg-mist-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                      <FileCheck2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-950">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        {typeLabels[item.type]} · {item.source}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ConfidentialityBadge level={item.confidentiality} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {linkedCodes(item).map((code) => (
                      <span
                        key={code}
                        className="rounded-md bg-mist-100 px-2 py-1 text-[11px] font-bold text-ink-600"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-ink-600">{item.collectedAt}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                    <CalendarClock className="size-3.5" />
                    {item.expiresAt ?? "Sans expiration"}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-ink-600">{item.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-mist-200 lg:hidden">
        {filtered.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                <FileCheck2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-5 text-ink-950">{item.title}</p>
                <p className="mt-1 text-xs text-ink-600">
                  {typeLabels[item.type]} · {item.source}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <ConfidentialityBadge level={item.confidentiality} />
              <span className="text-xs text-ink-600">Expire : {item.expiresAt ?? "jamais"}</span>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="p-14 text-center">
          <p className="font-bold text-ink-950">Aucune preuve trouvée</p>
          <p className="mt-1 text-sm text-ink-600">Modifiez votre recherche ou vos filtres.</p>
        </div>
      )}
      <div className="border-t border-mist-200 px-5 py-3 text-xs text-ink-600">
        {filtered.length} preuve{filtered.length !== 1 ? "s" : ""} · Les fichiers privés sont
        accessibles uniquement via une URL temporaire autorisée.
      </div>
    </div>
  );
}
