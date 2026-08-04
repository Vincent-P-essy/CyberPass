"use client";

import { CalendarDays, Download, Filter, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditEvent } from "@/lib/types";
import { csvRow } from "@/lib/csv";
import { Button, Input, Select } from "./ui";

const actionLabels: Record<string, string> = {
  QUESTIONNAIRE_ANSWER_APPROVED: "Réponse approuvée",
  EVIDENCE_CREATED: "Preuve ajoutée",
  CONTROL_UPDATED: "Contrôle modifié",
  SHARE_LINK_VIEWED: "Passeport consulté",
  AI_SUGGESTION_GENERATED: "Suggestions générées",
  QUESTIONNAIRE_IMPORTED: "Questionnaire importé",
  ORGANIZATION_CREATED: "Organisation créée"
};

export function AuditLog({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState("ALL");
  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          `${event.actor} ${event.detail} ${event.action}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (resource === "ALL" || event.resource === resource)
      ),
    [events, query, resource]
  );
  const exportCsv = () => {
    const csv = [
      csvRow(["Date", "Acteur", "Action", "Ressource", "Détail"]),
      ...filtered.map((event) =>
        csvRow([
          event.timestamp,
          event.actor,
          actionLabels[event.action] ?? event.action,
          event.resource,
          event.detail
        ])
      )
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "cyberpass-audit.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div>
      <div className="grid gap-3 border-b border-mist-200 p-4 sm:grid-cols-[1fr_210px_auto] sm:p-5">
        <label className="relative">
          <span className="sr-only">Rechercher dans le journal</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            className="pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un acteur, une action…"
          />
        </label>
        <label className="relative">
          <span className="sr-only">Filtrer par ressource</span>
          <Filter className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Select
            className="pl-10"
            value={resource}
            onChange={(event) => setResource(event.target.value)}
          >
            <option value="ALL">Toutes les ressources</option>
            <option>Contrôle</option>
            <option>Preuve</option>
            <option>Questionnaire</option>
            <option>Passeport</option>
            <option>Organisation</option>
          </Select>
        </label>
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="size-4" />
          Exporter
        </Button>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-left">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-50/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-600">
              <th className="px-6 py-3.5">Date</th>
              <th className="px-4 py-3.5">Acteur</th>
              <th className="px-4 py-3.5">Action</th>
              <th className="px-4 py-3.5">Ressource</th>
              <th className="px-4 py-3.5">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-200">
            {filtered.map((event) => (
              <tr key={event.id} className="hover:bg-mist-50">
                <td className="px-6 py-4 text-sm text-ink-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-3.5" />
                    {event.timestamp}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-ink-950">{event.actor}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mist-100 px-2.5 py-1 text-xs font-bold text-ink-800">
                    <ShieldCheck className="size-3" />
                    {actionLabels[event.action] ?? event.action}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-ink-600">{event.resource}</td>
                <td className="max-w-md px-4 py-4 text-sm text-ink-600">{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-mist-200 md:hidden">
        {filtered.map((event) => (
          <article key={event.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-ink-950">
                {actionLabels[event.action] ?? event.action}
              </p>
              <span className="text-[11px] text-ink-600">{event.timestamp}</span>
            </div>
            <p className="mt-2 text-sm text-ink-600">{event.detail}</p>
            <p className="mt-2 text-xs font-semibold text-brand-600">
              {event.actor} · {event.resource}
            </p>
          </article>
        ))}
      </div>
      <div className="border-t border-mist-200 px-5 py-3 text-xs text-ink-600">
        {filtered.length} événement{filtered.length !== 1 ? "s" : ""} · Pagination serveur prévue
        pour les journaux volumineux.
      </div>
    </div>
  );
}
