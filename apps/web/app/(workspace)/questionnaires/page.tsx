import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-server";
import { demoQuestionnaires } from "@/lib/demo-data";
import { QuestionnaireList } from "@/components/questionnaire-list";
import { ButtonLink, Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Questionnaires" };
export default async function QuestionnairesPage() {
  const result = await apiFetch("/questionnaires", demoQuestionnaires);
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Questionnaires de sécurité"
        title="Répondez avec vos preuves, jamais au hasard."
        description="Importez, relisez les suggestions sourcées et gardez l’approbation sous contrôle humain."
        actions={
          <ButtonLink href="/questionnaires/import">
            <Plus className="size-4" />
            Importer un questionnaire
          </ButtonLink>
        }
      />
      <DataSourceNotice source={result.source} message={result.message} />
      <Card className="overflow-hidden">
        <QuestionnaireList questionnaires={result.data} />
      </Card>
      <p className="text-xs leading-5 text-ink-600">
        Les propositions assistées ne sont jamais approuvées automatiquement. Vérifiez la portée et
        l’actualité des preuves avant toute validation.
      </p>
    </div>
  );
}
