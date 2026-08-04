import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuestionnaireImport } from "@/components/questionnaire-import";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Importer un questionnaire" };
export default function ImportQuestionnairePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <Link
          href="/questionnaires"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" />
          Retour aux questionnaires
        </Link>
        <h1 className="text-3xl font-[760] tracking-[-0.045em] text-ink-950 sm:text-4xl">
          Importer un questionnaire
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-600">
          Vérifiez la feuille et la colonne détectées avant de créer le questionnaire.
        </p>
      </div>
      <Card className="p-5 sm:p-8">
        <QuestionnaireImport />
      </Card>
    </div>
  );
}
