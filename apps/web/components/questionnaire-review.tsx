"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  LoaderCircle,
  Save,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { apiBaseUrl, apiMutation, demoMode } from "@/lib/api";
import { demoControls, demoEvidence } from "@/lib/demo-data";
import { csvRow } from "@/lib/csv";
import type { Control, Evidence, Questionnaire, QuestionnaireQuestion } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Button, EmptyState, SuccessMessage, Textarea, cn } from "./ui";

export function QuestionnaireReview({
  questionnaire,
  evidence = demoEvidence,
  controls = demoControls
}: {
  questionnaire: Questionnaire;
  evidence?: Evidence[];
  controls?: Control[];
}) {
  const initial = questionnaire.questions ?? [];
  const [questions, setQuestions] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id);
  const [draft, setDraft] = useState(initial[0]?.proposedAnswer ?? "");
  const [busy, setBusy] = useState<"save" | "approve" | "generate">();
  const [message, setMessage] = useState<string>();
  const activeIndex = questions.findIndex((item) => item.id === activeId);
  const active = questions[activeIndex];
  const citations = useMemo(
    () => evidence.filter((item) => active?.evidenceIds.includes(item.id)),
    [active, evidence]
  );
  const evidenceCodes = (item: Evidence) =>
    item.controlIds?.length
      ? item.controlIds
          .map((id) => controls.find((control) => control.id === id)?.code)
          .filter((code): code is string => Boolean(code))
      : item.controlCodes;

  const choose = (question: QuestionnaireQuestion) => {
    setActiveId(question.id);
    setDraft(question.proposedAnswer);
    setMessage(undefined);
  };
  const save = async () => {
    if (!active) return;
    setBusy("save");
    setMessage(undefined);
    const result = await apiMutation(
      `/questionnaires/${questionnaire.id}/questions/${active.id}/answer`,
      { method: "PATCH", body: JSON.stringify({ answer: draft }) }
    );
    if (result.ok)
      setQuestions((items) =>
        items.map((item) =>
          item.id === active.id
            ? { ...item, proposedAnswer: draft, status: "MANUALLY_ANSWERED" }
            : item
        )
      );
    setBusy(undefined);
    setMessage(result.message);
  };
  const approve = async () => {
    if (!active) return;
    setBusy("approve");
    setMessage(undefined);
    const result = await apiMutation(
      `/questionnaires/${questionnaire.id}/questions/${active.id}/approve`,
      { method: "POST", body: JSON.stringify({ answer: draft }) }
    );
    if (result.ok)
      setQuestions((items) =>
        items.map((item) =>
          item.id === active.id ? { ...item, proposedAnswer: draft, status: "APPROVED" } : item
        )
      );
    setBusy(undefined);
    setMessage(result.message);
  };
  const generate = async () => {
    setBusy("generate");
    setMessage(undefined);
    const result = await apiMutation(`/questionnaires/${questionnaire.id}/generate`, {
      method: "POST",
      body: JSON.stringify({ allowExternalProvider: false })
    });
    setBusy(undefined);
    setMessage(result.message);
  };
  const exportCsv = async () => {
    if (!demoMode) {
      const response = await fetch(
        `${apiBaseUrl}/questionnaires/${questionnaire.id}/export?format=csv`,
        { credentials: "include", headers: { Accept: "text/csv" } }
      );
      if (!response.ok) {
        setMessage("L’export sécurisé n’a pas pu être généré.");
        return;
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await response.blob());
      link.download = `${questionnaire.name}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    const csv = [
      csvRow(["Question", "Réponse", "Statut"]),
      ...questions.map((item) => csvRow([item.text, item.proposedAnswer, item.status]))
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${questionnaire.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!active)
    return (
      <EmptyState
        icon={Sparkles}
        title="Aucune question à relire"
        description="Lancez la génération depuis un questionnaire prêt ou vérifiez que l’import a bien extrait les questions."
        action={
          <Button onClick={generate} disabled={busy === "generate"}>
            {busy === "generate" && <LoaderCircle className="size-4 animate-spin" />}Générer des
            suggestions
          </Button>
        }
      />
    );
  const go = (index: number) => {
    const question = questions[index];
    if (question) choose(question);
  };

  return (
    <div className="grid min-h-[680px] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-mist-200 lg:border-b-0 lg:border-r">
        <div className="border-b border-mist-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">Questions</p>
            <span className="text-xs font-bold text-ink-600">
              {questions.filter((item) => item.status === "APPROVED").length}/{questions.length}{" "}
              approuvées
            </span>
          </div>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-mist-200">
            <span
              className="block h-full rounded-full bg-brand-500"
              style={{
                width: `${(questions.filter((item) => item.status === "APPROVED").length / questions.length) * 100}%`
              }}
            />
          </span>
        </div>
        <div
          className="scrollbar-thin max-h-72 overflow-y-auto p-2 lg:max-h-[600px]"
          role="listbox"
          aria-label="Questions du questionnaire"
        >
          {questions.map((question) => (
            <button
              key={question.id}
              type="button"
              role="option"
              aria-selected={question.id === active.id}
              onClick={() => choose(question)}
              className={cn(
                "mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left",
                question.id === active.id
                  ? "bg-brand-50 ring-1 ring-inset ring-brand-200"
                  : "hover:bg-mist-50"
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold",
                  question.status === "APPROVED"
                    ? "bg-brand-100 text-brand-700"
                    : question.id === active.id
                      ? "bg-brand-600 text-white"
                      : "bg-mist-100 text-ink-600"
                )}
              >
                {question.status === "APPROVED" ? <Check className="size-3.5" /> : question.order}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-bold leading-5 text-ink-950">
                  {question.text}
                </span>
                <StatusBadge status={question.status} className="mt-2" />
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="min-w-0 p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-brand-600">
            Question {active.order} sur {questions.length}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={exportCsv}>
              <Download className="size-4" />
              Exporter CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 px-3"
              onClick={generate}
              disabled={!!busy}
            >
              <Sparkles className="size-4" />
              Regénérer
            </Button>
          </div>
        </div>
        <h2 className="mt-4 text-balance text-xl font-[740] leading-8 tracking-[-0.025em] text-ink-950 sm:text-2xl">
          {active.text}
        </h2>
        <div className="mt-6 rounded-2xl border border-[#ded5ff] bg-[#faf9ff] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#6552a3]" />
              <p className="text-sm font-bold text-[#514182]">Proposition assistée</p>
            </div>
            {active.confidence !== undefined && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#6552a3] ring-1 ring-[#ded5ff]">
                Confiance de génération : {Math.round(active.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#6552a3]">
            Indicateur technique, pas un niveau de sécurité. La réponse exige une revue humaine.
          </p>
        </div>
        <label className="mt-5 grid gap-2 text-sm font-bold text-ink-800">
          Réponse à transmettre
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-44 text-[15px] leading-7"
          />
        </label>
        {active.missingInformation.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-600/15 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-600">
              <AlertTriangle className="size-4" />
              Informations manquantes
            </p>
            <ul className="mt-2 grid gap-1 pl-6 text-sm leading-6 text-amber-600">
              {active.missingInformation.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-ink-950">Preuves citées</h3>
          {citations.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {citations.map((evidence) => (
                <div
                  key={evidence.id}
                  className="flex items-center gap-3 rounded-xl border border-mist-200 bg-mist-50 p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600">
                    <FileCheck2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-950">{evidence.title}</p>
                    <p className="mt-0.5 text-xs text-ink-600">
                      Collectée le {evidence.collectedAt} · {evidence.source}
                    </p>
                  </div>
                  <span className="hidden text-xs font-bold text-ink-600 sm:block">
                    {evidenceCodes(evidence).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              Aucune preuve disponible : n’approuvez pas cette réponse sans source suffisante.
            </div>
          )}
        </div>
        {message && (
          <div className="mt-5">
            <SuccessMessage>{message}</SuccessMessage>
          </div>
        )}
        <div className="mt-7 flex flex-col gap-3 border-t border-mist-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => go(activeIndex - 1)}
              disabled={activeIndex <= 0}
            >
              <ChevronLeft className="size-4" />
              Précédente
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => go(activeIndex + 1)}
              disabled={activeIndex >= questions.length - 1}
            >
              Suivante
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={save} disabled={!!busy}>
              {busy === "save" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Enregistrer
            </Button>
            <Button type="button" onClick={approve} disabled={!!busy || draft.trim().length < 3}>
              {busy === "approve" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Approuver la réponse
            </Button>
          </div>
        </div>
        {demoMode && (
          <p className="mt-3 text-right text-xs text-ink-600">
            En mode démonstration, les changements restent uniquement dans cette page.
          </p>
        )}
      </section>
    </div>
  );
}
