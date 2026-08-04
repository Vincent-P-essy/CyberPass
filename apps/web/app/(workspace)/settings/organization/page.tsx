import type { Metadata } from "next";
import { OrganizationSettings } from "@/components/organization-settings";
import { Card, DataSourceNotice, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api-server";

interface CurrentOrganization {
  id: string;
  name: string;
  description?: string | null;
}

export const metadata: Metadata = { title: "Paramètres de l’organisation" };
export default async function OrganizationSettingsPage() {
  const organization = await apiFetch<CurrentOrganization>("/organizations/current", {
    id: "demo-acme",
    name: "Acme Cloud Europe",
    description: "Éditeur SaaS B2B européen."
  });
  return (
    <div className="mx-auto grid max-w-5xl gap-7">
      <PageHeader
        eyebrow="Paramètres"
        title="Organisation & accès"
        description="Gérez l’identité de l’organisation, les collaborateurs et leurs rôles."
      />
      <DataSourceNotice source={organization.source} message={organization.message} />
      <Card className="overflow-hidden">
        <OrganizationSettings
          organization={organization.data}
          isDemo={organization.source === "demo"}
        />
      </Card>
    </div>
  );
}
