import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileSpreadsheet, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api-server";
import { demoControls, demoEvidence, demoQuestionnaires } from "@/lib/demo-data";
import type { Questionnaire } from "@/lib/types";
import { QuestionnaireReview } from "@/components/questionnaire-review";
import { StatusBadge } from "@/components/status-badge";
import { Card, DataSourceNotice } from "@/components/ui";

export const metadata: Metadata = { title: "Revue du questionnaire" };
export default async function QuestionnaireDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixture = demoQuestionnaires.find((item) => item.id === id);
  const fallback: Questionnaire = fixture ?? {
    id,
    name: "",
    customer: "",
    status: "READY",
    progress: 0,
    questionCount: 0,
    reviewCount: 0,
    importedAt: "",
    questions: []
  };
  let result;
  try {
    result = await apiFetch<Questionnaire>(`/questionnaires/${id}`, fallback);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }
  if (result.source === "demo" && !fixture) notFound();
  const [evidenceResult, controlsResult] = await Promise.all([
    apiFetch("/evidences", demoEvidence),
    apiFetch("/controls", demoControls)
  ]);
  const evidence =
    evidenceResult.source === "api" || result.source === "demo" ? evidenceResult.data : [];
  const item = result.data;
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/questionnaires"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" />
          Retour aux questionnaires
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={item.status} />
              <span className="text-xs font-semibold text-ink-600">Revue humaine obligatoire</span>
            </div>
            <h1 className="mt-3 text-balance text-3xl font-[760] tracking-[-0.045em] text-ink-950 sm:text-4xl">
              {item.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" />
                {item.customer}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileSpreadsheet className="size-4" />
                {item.questionCount} questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Importé le {item.importedAt}
              </span>
            </div>
          </div>
        </div>
      </div>
      <DataSourceNotice source={result.source} message={result.message} />
      <Card className="overflow-hidden">
        <QuestionnaireReview
          questionnaire={item}
          evidence={evidence}
          controls={controlsResult.data}
        />
      </Card>
    </div>
  );
}
