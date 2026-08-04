import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { apiFetch } from "@/lib/api-server";
import { demoAudit } from "@/lib/demo-data";
import { AuditLog } from "@/components/audit-log";
import { Card, DataSourceNotice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Journal d’audit" };
export default async function AuditPage() {
  const result = await apiFetch("/audit-events", demoAudit);
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Traçabilité"
        title="Journal d’audit"
        description="Une chronologie des actions importantes, consultable sans exposer de métadonnées sensibles."
        actions={
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-700">
            <LockKeyhole className="size-4" />
            Append-only
          </span>
        }
      />
      <DataSourceNotice source={result.source} message={result.message} />
      <Card className="overflow-hidden">
        <AuditLog events={result.data} />
      </Card>
      <p className="text-xs leading-5 text-ink-600">
        Le journal est en lecture seule depuis l’application. Les adresses réseau et user-agents,
        lorsqu’ils sont collectés, sont réservés aux utilisateurs autorisés et ne sont pas affichés
        dans cette vue synthétique.
      </p>
    </div>
  );
}
