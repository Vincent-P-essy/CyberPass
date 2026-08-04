"use client";

import { ArrowRight, FileSpreadsheet, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Questionnaire } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Input, Select } from "./ui";

export function QuestionnaireList({ questionnaires }: { questionnaires: Questionnaire[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(
    () =>
      questionnaires.filter(
        (item) =>
          `${item.name} ${item.customer}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === "ALL" || item.status === status)
      ),
    [questionnaires, query, status]
  );
  return (
    <div>
      <div className="grid gap-3 border-b border-mist-200 p-4 sm:grid-cols-[1fr_220px] sm:p-5">
        <label className="relative">
          <span className="sr-only">Rechercher un questionnaire</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            className="pl-10"
            placeholder="Rechercher par nom ou client…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par statut</span>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tous les statuts</option>
            <option value="READY">Prêt</option>
            <option value="IN_REVIEW">En revue</option>
            <option value="COMPLETED">Terminé</option>
            <option value="FAILED">Échec</option>
          </Select>
        </label>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] text-left">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-50/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-600">
              <th className="px-6 py-3.5">Questionnaire</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5">Progression</th>
              <th className="px-4 py-3.5">À valider</th>
              <th className="px-4 py-3.5">Importé</th>
              <th className="w-12 px-4 py-3.5">
                <span className="sr-only">Ouvrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-200">
            {filtered.map((item) => (
              <tr key={item.id} className="group hover:bg-mist-50">
                <td className="px-6 py-4">
                  <Link href={`/questionnaires/${item.id}`} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ee] text-brand-600">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink-950 group-hover:text-brand-700">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-600">
                        {item.customer} · {item.questionCount} questions
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-mist-200">
                      <span
                        className="block h-full rounded-full bg-brand-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </span>
                    <span className="text-xs font-bold text-ink-600">{item.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-ink-800">{item.reviewCount}</td>
                <td className="px-4 py-4 text-sm text-ink-600">{item.importedAt}</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/questionnaires/${item.id}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                    aria-label={`Ouvrir ${item.name}`}
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
        {filtered.map((item) => (
          <Link
            href={`/questionnaires/${item.id}`}
            key={item.id}
            className="block p-4 hover:bg-mist-50"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist-100 text-brand-600">
                <FileSpreadsheet className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-5 text-ink-950">{item.name}</p>
                <p className="mt-1 text-xs text-ink-600">
                  {item.customer} · {item.questionCount} questions
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-1.5 flex-1 rounded-full bg-mist-200">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{ width: `${item.progress}%` }}
                />
              </span>
              <span className="text-xs font-bold text-ink-600">{item.progress}%</span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="p-14 text-center">
          <p className="font-bold text-ink-950">Aucun questionnaire trouvé</p>
          <p className="mt-1 text-sm text-ink-600">Essayez un autre filtre.</p>
        </div>
      )}
    </div>
  );
}
