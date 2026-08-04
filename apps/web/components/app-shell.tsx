"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  X
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "./ui";
import { apiMutation } from "@/lib/api";
import { useRouter } from "next/navigation";

export interface ShellOrganization {
  id: string;
  name: string;
  initials: string;
}

export interface ShellUser {
  name: string;
  initials: string;
  role: string;
}

const primaryNav = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/controls", label: "Contrôles", icon: ClipboardList },
  { href: "/evidence", label: "Preuves", icon: FileCheck2 },
  { href: "/questionnaires", label: "Questionnaires", icon: FileText },
  { href: "/passport/new", label: "Passeport cyber", icon: ShieldCheck },
  { href: "/audit", label: "Journal d’audit", icon: ScrollText }
] as const;

const secondaryNav = [
  { href: "/settings/organization", label: "Organisation", icon: Settings },
  { href: "/help", label: "Centre d’aide", icon: HelpCircle }
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-[620]",
        active
          ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
          : "text-white/60 hover:bg-white/[.055] hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "size-[18px]",
          active ? "text-[#cdea76]" : "text-white/48 group-hover:text-white/80"
        )}
        strokeWidth={1.8}
      />
      {label}
    </Link>
  );
}

function Sidebar({
  pathname,
  organizations,
  currentOrganizationId,
  user,
  onNavigate
}: {
  pathname: string;
  organizations: ShellOrganization[];
  currentOrganizationId: string;
  user: ShellUser;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [activeOrganizationId, setActiveOrganizationId] = useState(
    currentOrganizationId || organizations[0]?.id || ""
  );
  const [switching, setSwitching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();
  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href.replace("/new", ""));
  const switchOrganization = async (id: string) => {
    if (id === "__new__") {
      router.push("/onboarding");
      onNavigate?.();
      return;
    }
    if (!id || id === activeOrganizationId) return;
    setSwitching(true);
    const result = await apiMutation(`/organizations/${id}/select`, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (result.ok) {
      setActiveOrganizationId(id);
      router.refresh();
    }
    setSwitching(false);
  };
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError(undefined);
    const result = await apiMutation("/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
    setLoggingOut(false);
    if (!result.ok) {
      setLogoutError("La déconnexion n’a pas abouti. Votre session reste active ; réessayez.");
      return;
    }
    router.push("/login");
  };
  return (
    <div className="flex h-full flex-col bg-ink-950 px-4 pb-4 pt-5">
      <div className="px-2">
        <Logo inverse />
      </div>
      <div className="mt-7 rounded-xl border border-white/[.07] bg-white/[.045] p-2.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.13em] text-white/40">
          Organisation active
        </p>
        <div className="relative mt-2 flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#d7f36a] text-[11px] font-extrabold text-ink-950">
            {organizations.find((item) => item.id === activeOrganizationId)?.initials ?? "OR"}
          </span>
          <select
            value={activeOrganizationId}
            disabled={switching}
            onChange={(event) => void switchOrganization(event.target.value)}
            className="min-w-0 flex-1 appearance-none truncate bg-transparent py-1 pr-5 text-sm font-semibold text-white outline-none disabled:opacity-60"
            aria-label="Organisation active"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id} className="text-ink-950">
                {organization.name}
              </option>
            ))}
            <option value="__new__" className="text-ink-950">
              + Nouvelle organisation
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 size-4 text-white/45" />
        </div>
      </div>
      <nav aria-label="Navigation principale" className="mt-5 grid gap-1">
        {primaryNav.map((item) => (
          <NavLink key={item.href} {...item} active={active(item.href)} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto">
        <nav
          aria-label="Navigation secondaire"
          className="grid gap-1 border-t border-white/[.08] pt-4"
        >
          {secondaryNav.map((item) => (
            <NavLink key={item.href} {...item} active={active(item.href)} onNavigate={onNavigate} />
          ))}
        </nav>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[.045] px-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {user.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
            <span className="block truncate text-[11px] text-white/45">{user.role}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Se déconnecter"
          >
            {loggingOut ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </button>
        </div>
        {logoutError && (
          <p
            role="alert"
            className="mt-2 rounded-lg bg-rose-600/15 px-3 py-2 text-xs leading-5 text-rose-50"
          >
            {logoutError}
          </p>
        )}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  organizations,
  currentOrganizationId,
  user
}: {
  children: React.ReactNode;
  organizations: ShellOrganization[];
  currentOrganizationId: string;
  user: ShellUser;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-mist-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">
        <Sidebar
          pathname={pathname}
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
          user={user}
        />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer la navigation"
          />
          <aside className="relative h-full w-[min(86vw,300px)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X className="size-5" />
            </button>
            <Sidebar
              pathname={pathname}
              organizations={organizations}
              currentOrganizationId={currentOrganizationId}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-mist-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-mist-200 text-ink-800 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs font-semibold text-ink-600 sm:flex">
              <BookOpenCheck className="size-4 text-brand-600" />
              <span>CyberPass Starter Framework</span>
              <span className="rounded-full bg-mist-100 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                Démonstration
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/audit"
              className="relative grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-mist-100 hover:text-ink-950"
              aria-label="Voir l’activité récente"
            >
              <Bell className="size-5" />
            </Link>
            <span className="h-6 w-px bg-mist-200" />
            <Link
              href="/settings/organization"
              className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-mist-100"
              aria-label={`Ouvrir les paramètres de ${user.name}`}
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {user.initials}
              </span>
              <ChevronDown className="hidden size-4 text-ink-600 sm:block" />
            </Link>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
