"use client";

import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Control, ControlStatus } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Input, Select } from "./ui";

export function ControlsTable({ controls }: { controls: Control[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ControlStatus | "ALL">("ALL");
  const [domain, setDomain] = useState("ALL");
  const domains = useMemo(
    () => Array.from(new Set(controls.map((item) => item.domain))).sort(),
    [controls]
  );
  const filtered = useMemo(
    () =>
      controls.filter((control) => {
        const text = `${control.code} ${control.title} ${control.description}`.toLocaleLowerCase(
          "fr"
        );
        return (
          text.includes(query.toLocaleLowerCase("fr")) &&
          (status === "ALL" || control.status === status) &&
          (domain === "ALL" || control.domain === domain)
        );
      }),
    [controls, domain, query, status]
  );

  return (
    <div>
      <div className="grid gap-3 border-b border-mist-200 p-4 sm:grid-cols-[minmax(260px,1fr)_210px_210px] sm:p-5">
        <label className="relative">
          <span className="sr-only">Rechercher un contrôle</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            className="pl-10"
            placeholder="Rechercher par intitulé ou identifiant…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="relative">
          <span className="sr-only">Filtrer par statut</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Select
            className="pl-10"
            value={status}
            onChange={(event) => setStatus(event.target.value as ControlStatus | "ALL")}
          >
            <option value="ALL">Tous les statuts</option>
            <option value="VERIFIED">Vérifié</option>
            <option value="IMPLEMENTED">Mis en œuvre</option>
            <option value="PARTIAL">Partiel</option>
            <option value="NOT_ASSESSED">À évaluer</option>
            <option value="NOT_IMPLEMENTED">Non mis en œuvre</option>
          </Select>
        </label>
        <label>
          <span className="sr-only">Filtrer par domaine</span>
          <Select value={domain} onChange={(event) => setDomain(event.target.value)}>
            <option value="ALL">Tous les domaines</option>
            {domains.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </label>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-50/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-600">
              <th className="px-6 py-3.5">Contrôle</th>
              <th className="px-4 py-3.5">Domaine</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5">Preuves</th>
              <th className="px-4 py-3.5">Dernière revue</th>
              <th className="w-12 px-4 py-3.5">
                <span className="sr-only">Ouvrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-200">
            {filtered.map((control) => (
              <tr key={control.id} className="group hover:bg-mist-50">
                <td className="px-6 py-4">
                  <Link href={`/controls/${control.id}`} className="block">
                    <span className="text-xs font-bold text-brand-600">{control.code}</span>
                    <span className="mt-0.5 block text-sm font-bold text-ink-950 group-hover:text-brand-700">
                      {control.title}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4 text-sm text-ink-600">{control.domain}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={control.status} />
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-ink-800">
                  {control.evidenceCount}
                </td>
                <td className="px-4 py-4 text-sm text-ink-600">
                  {control.lastReviewed ?? "Jamais"}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/controls/${control.id}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                    aria-label={`Ouvrir ${control.title}`}
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-mist-200 md:hidden">
        {filtered.map((control) => (
          <Link
            href={`/controls/${control.id}`}
            key={control.id}
            className="block p-4 hover:bg-mist-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-brand-600">{control.code}</p>
                <p className="mt-1 font-bold text-ink-950">{control.title}</p>
              </div>
              <StatusBadge status={control.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-600">
              <span>{control.domain}</span>
              <span>
                {control.evidenceCount} preuve{control.evidenceCount !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="px-5 py-14 text-center">
          <p className="font-bold text-ink-950">Aucun contrôle ne correspond</p>
          <p className="mt-1 text-sm text-ink-600">Modifiez les filtres ou votre recherche.</p>
        </div>
      )}
      <div className="border-t border-mist-200 px-5 py-3 text-xs text-ink-600">
        {filtered.length} contrôle{filtered.length !== 1 ? "s" : ""} affiché
        {filtered.length !== 1 ? "s" : ""} sur {controls.length}
      </div>
    </div>
  );
}
