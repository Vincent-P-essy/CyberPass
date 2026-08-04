import { AppShell } from "@/components/app-shell";
import { ApiRequestError, apiFetch } from "@/lib/api-server";
import { requiresOrganizationSelection } from "@/lib/organization-routing";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface ApiOrganization {
  id: string;
  name: string;
  role?: string;
}

interface ApiMe {
  id: string;
  fullName: string;
  email: string;
}

const roleLabels: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  ANALYST: "Analyste",
  VIEWER: "Lecteur"
};

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const fallback: ApiOrganization[] = [
    { id: "demo-acme", name: "Acme Cloud Europe", role: "OWNER" }
  ];
  let workspace;
  try {
    workspace = await Promise.all([
      apiFetch<ApiOrganization[]>("/organizations", fallback),
      apiFetch<ApiOrganization>("/organizations/current", fallback[0] as ApiOrganization),
      apiFetch<ApiMe>("/auth/me", {
        id: "demo-vincent",
        fullName: "Plessy Vincent",
        email: "vincent@acme.example"
      })
    ]);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) redirect("/login");
    if (
      error instanceof ApiRequestError &&
      requiresOrganizationSelection(error.status, error.path)
    ) {
      redirect("/select-organization");
    }
    throw error;
  }
  const [organizations, current, me] = workspace;
  const shellOrganizations = organizations.data.map((item) => ({
    ...item,
    initials: item.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }));
  const initials = me.data.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <AppShell
      organizations={shellOrganizations}
      currentOrganizationId={current.data.id}
      user={{
        name: me.data.fullName,
        initials,
        role: roleLabels[current.data.role ?? ""] ?? current.data.role ?? "Membre"
      }}
    >
      {children}
    </AppShell>
  );
}
