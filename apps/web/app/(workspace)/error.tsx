"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function WorkspaceError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Le détail reste dans la console locale ; aucune donnée sensible n'est rendue à l'écran.
    console.error("CyberPass workspace request failed", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-mist-50 px-5">
      <div className="w-full max-w-md rounded-3xl border border-mist-200 bg-white p-7 text-center shadow-card sm:p-9">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-[760] tracking-[-0.035em] text-ink-950">
          Données indisponibles
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          CyberPass ne peut pas vérifier votre session ou charger les données de l’organisation.
          Aucune donnée de démonstration ne leur a été substituée.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" />
          Réessayer
        </Button>
      </div>
    </main>
  );
}
