import Link from "next/link";

export function Logo({
  compact = false,
  inverse = false
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      className="group inline-flex items-center gap-3 rounded-lg"
      aria-label="CyberPass — accueil"
    >
      <span className="relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]">
        <span className="absolute inset-[7px] rounded-[5px] border-2 border-white/95" />
        <span className="absolute -right-[2px] top-[13px] h-1.5 w-2.5 rounded-full bg-[#d7f36a] ring-[3px] ring-brand-500" />
      </span>
      {!compact && (
        <span
          className={`text-[18px] font-[760] tracking-[-0.035em] ${inverse ? "text-white" : "text-ink-950"}`}
        >
          CyberPass
        </span>
      )}
    </Link>
  );
}
