"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { Control, ControlStatus } from "@/lib/types";
import { apiMutation } from "@/lib/api";
import { Button, Select, SuccessMessage, Textarea } from "./ui";

export function ControlUpdateForm({ control }: { control: Control }) {
  const [status, setStatus] = useState<ControlStatus>(control.status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const save = async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await apiMutation(`/controls/${control.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes: note })
    });
    setBusy(false);
    setMessage(result.message);
  };
  return (
    <div className="grid gap-4">
      {message && <SuccessMessage>{message}</SuccessMessage>}
      <label className="grid gap-1.5 text-sm font-bold text-ink-800">
        Statut
        <Select value={status} onChange={(event) => setStatus(event.target.value as ControlStatus)}>
          <option value="NOT_ASSESSED">À évaluer</option>
          <option value="NOT_IMPLEMENTED">Non mis en œuvre</option>
          <option value="PARTIAL">Partiel</option>
          <option value="IMPLEMENTED">Mis en œuvre</option>
          <option value="VERIFIED">Vérifié</option>
          <option value="NOT_APPLICABLE">Non applicable</option>
        </Select>
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-ink-800">
        Note de revue
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Documentez le contexte, les limites ou la prochaine action…"
        />
      </label>
      <p className="text-xs leading-5 text-ink-600">
        Le statut « Vérifié » doit s’appuyer sur une preuve datée et une revue traçable. Il ne
        constitue pas une certification.
      </p>
      <Button type="button" onClick={save} disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        Enregistrer la revue
      </Button>
    </div>
  );
}
