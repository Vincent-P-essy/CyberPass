"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiMutation } from "@/lib/api";
import { Button, Field, Input, Select, SuccessMessage } from "./ui";

type Preview = {
  sheetName: string;
  columns: string[];
  questionColumn: string;
  rows: Array<Record<string, string>>;
  detectedCount: number;
};
const demoPreview: Preview = {
  sheetName: "Security assessment",
  columns: ["ID", "Domaine", "Question", "Réponse attendue"],
  questionColumn: "Question",
  detectedCount: 10,
  rows: [
    {
      ID: "SEC-01",
      Domaine: "Accès",
      Question: "L’authentification multifacteur est-elle imposée aux administrateurs ?",
      "Réponse attendue": "Texte"
    },
    {
      ID: "SEC-02",
      Domaine: "Résilience",
      Question: "À quelle fréquence les restaurations sont-elles testées ?",
      "Réponse attendue": "Texte"
    },
    {
      ID: "SEC-03",
      Domaine: "Incident",
      Question: "Disposez-vous d’un plan documenté de réponse aux incidents ?",
      "Réponse attendue": "Oui / Non + détail"
    },
    {
      ID: "SEC-04",
      Domaine: "Développement",
      Question: "Les dépôts de code sont-ils protégés par des règles de branche ?",
      "Réponse attendue": "Texte"
    }
  ]
};

export function QuestionnaireImport() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File>();
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [questionColumn, setQuestionColumn] = useState("Question");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const requestPreview = async () => {
    setError(undefined);
    if (!file) {
      setError("Sélectionnez un fichier CSV ou XLSX.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError("Format non pris en charge. Utilisez un fichier CSV ou XLSX.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 10 Mo.");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append("file", file, file.name);
    const result = await apiMutation<Preview>("/questionnaires/preview", {
      method: "POST",
      body: form
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const nextPreview = result.data ?? demoPreview;
    setPreview(nextPreview);
    setQuestionColumn(nextPreview.questionColumn);
    setStep(2);
    if (!result.persisted)
      setMessage(
        "Aperçu d’exemple affiché en mode démonstration. Le fichier n’a pas été téléversé."
      );
  };
  const confirmImport = async () => {
    if (!file || !preview) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("name", name || file.name.replace(/\.(csv|xlsx)$/i, ""));
    form.append("sheetName", preview.sheetName);
    form.append("questionColumn", questionColumn);
    const result = await apiMutation<{ id: string }>("/questionnaires/import", {
      method: "POST",
      body: form
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.persisted && result.data?.id) router.push(`/questionnaires/${result.data.id}`);
    else {
      setMessage(result.message);
      router.push("/questionnaires/q-grandcompte");
    }
  };

  return (
    <div>
      <ol className="mb-8 flex items-center" aria-label="Progression de l’import">
        <li className="flex flex-1 items-center gap-3">
          <span
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${step >= 1 ? "bg-brand-600 text-white" : "bg-mist-100 text-ink-600"}`}
          >
            1
          </span>
          <span className="text-sm font-bold text-ink-950">Fichier</span>
          <span className="h-px flex-1 bg-mist-200" />
        </li>
        <li className="flex items-center gap-3 pl-3">
          <span
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${step >= 2 ? "bg-brand-600 text-white" : "bg-mist-100 text-ink-600"}`}
          >
            2
          </span>
          <span className="text-sm font-bold text-ink-950">Aperçu & mapping</span>
        </li>
      </ol>
      {error && (
        <p
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-600"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {message && (
        <div className="mb-5">
          <SuccessMessage>{message}</SuccessMessage>
        </div>
      )}
      {step === 1 ? (
        <div className="grid gap-6">
          <Field
            label="Nom du questionnaire"
            hint="Optionnel — le nom du fichier sera utilisé par défaut."
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Évaluation fournisseur 2026"
            />
          </Field>
          <label className="group grid min-h-60 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-mist-300 bg-mist-50 px-6 py-10 text-center hover:border-brand-300 hover:bg-brand-50/30">
            <span>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <FileUp className="size-6" />
              </span>
              <span className="mt-4 block font-bold text-ink-950">
                {file ? file.name : "Déposez un fichier ou parcourez vos dossiers"}
              </span>
              <span className="mt-1.5 block text-sm text-ink-600">CSV ou XLSX · 10 Mo maximum</span>
              {file && (
                <span className="mt-2 block text-xs font-semibold text-brand-700">
                  {(file.size / 1024).toFixed(1)} Ko sélectionné
                </span>
              )}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </label>
          <div className="flex items-start gap-3 rounded-xl bg-mist-50 p-4 text-xs leading-5 text-ink-600">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p>
              Le contenu importé est traité comme une donnée non fiable. Aucune instruction trouvée
              dans le fichier ne sera exécutée. Le fichier n’est pas transmis à un fournisseur d’IA
              à cette étape.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={requestPreview} disabled={busy}>
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Analyser le fichier
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        preview && (
          <div className="grid gap-6">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="rounded-xl bg-mist-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
                  Feuille détectée
                </p>
                <p className="mt-1.5 text-sm font-bold text-ink-950">{preview.sheetName}</p>
              </div>
              <div className="rounded-xl bg-mist-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
                  Questions détectées
                </p>
                <p className="mt-1.5 text-sm font-bold text-ink-950">{preview.detectedCount}</p>
              </div>
              <Field label="Colonne des questions">
                <Select
                  value={questionColumn}
                  onChange={(event) => setQuestionColumn(event.target.value)}
                >
                  {preview.columns.map((column) => (
                    <option key={column}>{column}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="overflow-hidden rounded-xl border border-mist-200">
              <div className="flex items-center justify-between border-b border-mist-200 bg-mist-50 px-4 py-3">
                <p className="text-sm font-bold text-ink-950">Aperçu des premières lignes</p>
                <span className="text-xs text-ink-600">Colonnes originales conservées</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-mist-200 text-xs text-ink-600">
                      {preview.columns.map((column) => (
                        <th
                          key={column}
                          className={`px-4 py-3 font-bold ${column === questionColumn ? "bg-brand-50 text-brand-700" : ""}`}
                        >
                          {column}
                          {column === questionColumn && (
                            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px]">
                              Question
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist-200">
                    {preview.rows.map((row, index) => (
                      <tr key={index}>
                        {preview.columns.map((column) => (
                          <td
                            key={column}
                            className={`max-w-md px-4 py-3 align-top leading-5 text-ink-600 ${column === questionColumn ? "bg-brand-50/40 font-semibold text-ink-950" : ""}`}
                          >
                            {row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" />
                Changer de fichier
              </Button>
              <Button type="button" onClick={confirmImport} disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Confirmer l’import
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
