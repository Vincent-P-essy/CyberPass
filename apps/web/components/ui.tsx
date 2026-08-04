import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, Database, type LucideIcon } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-[680] tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary:
    "border border-mist-300 bg-white text-ink-800 shadow-sm hover:border-brand-200 hover:bg-brand-50",
  ghost: "text-ink-600 hover:bg-mist-100 hover:text-ink-950",
  danger: "border border-rose-600/20 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
} as const;

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <Link href={href} className={cn(buttonBase, buttonVariants[variant], className)}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-[650] text-ink-800", className)}>
      <span>
        {label}
        {required && (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="text-xs font-normal leading-5 text-ink-600">{hint}</span>}
      {error && (
        <span className="flex items-center gap-1 text-xs font-medium text-rose-600" role="alert">
          <AlertCircle className="size-3.5" />
          {error}
        </span>
      )}
    </label>
  );
}

const inputStyle =
  "min-h-11 w-full rounded-xl border border-mist-300 bg-white px-3.5 text-[15px] font-normal text-ink-950 shadow-[0_1px_2px_rgba(16,42,43,.03)] placeholder:text-ink-600/60 hover:border-mist-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputStyle, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputStyle,
        "appearance-none bg-[linear-gradient(45deg,transparent_50%,#557071_50%),linear-gradient(135deg,#557071_50%,transparent_50%)] bg-[position:calc(100%-16px)_19px,calc(100%-11px)_19px] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputStyle, "min-h-28 resize-y py-3 leading-6", className)}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-mist-200 bg-white shadow-card", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance text-[clamp(1.75rem,3vw,2.35rem)] font-[760] leading-[1.08] tracking-[-0.045em] text-ink-950">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-600">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function DataSourceNotice({
  source,
  message
}: {
  source: "api" | "demo";
  message?: string;
}) {
  if (source === "api") return null;
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-600/15 bg-amber-50 px-4 py-3 text-sm text-amber-600"
      role="status"
    >
      <Database className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Données de démonstration.</strong>{" "}
        {message ?? "Connectez l’API pour activer la persistance et les actions réelles."}
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-5 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-mist-100 text-brand-600">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-bold tracking-[-0.02em] text-ink-950">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-ink-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700"
    >
      <Check className="mt-0.5 size-4 shrink-0" />
      {children}
    </div>
  );
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-semibold text-brand-600 underline decoration-brand-200 underline-offset-4 hover:text-brand-700"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}
