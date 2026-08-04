import { cn } from "./ui";
import {
  answerStatusLabel,
  confidentialityLabel,
  controlStatusLabel,
  questionnaireStatusLabel
} from "@/lib/format";
import type {
  AnswerStatus,
  Confidentiality,
  ControlStatus,
  QuestionnaireStatus
} from "@/lib/types";

const tones: Record<string, string> = {
  VERIFIED: "bg-brand-100 text-brand-700 ring-brand-200",
  IMPLEMENTED: "bg-[#e9f3ff] text-[#21629b] ring-[#cfe4fa]",
  PARTIAL: "bg-amber-50 text-amber-600 ring-[#f7dfab]",
  NOT_ASSESSED: "bg-mist-100 text-ink-600 ring-mist-200",
  NOT_IMPLEMENTED: "bg-rose-50 text-rose-600 ring-[#f7d3d9]",
  NOT_APPLICABLE: "bg-mist-100 text-ink-600 ring-mist-200",
  READY: "bg-[#e9f3ff] text-[#21629b] ring-[#cfe4fa]",
  IN_REVIEW: "bg-amber-50 text-amber-600 ring-[#f7dfab]",
  COMPLETED: "bg-brand-100 text-brand-700 ring-brand-200",
  EXPORTED: "bg-brand-100 text-brand-700 ring-brand-200",
  FAILED: "bg-rose-50 text-rose-600 ring-[#f7d3d9]",
  IMPORTED: "bg-mist-100 text-ink-600 ring-mist-200",
  PROCESSING: "bg-[#f1edff] text-[#6552a3] ring-[#ded5ff]",
  GENERATED: "bg-amber-50 text-amber-600 ring-[#f7dfab]",
  NEEDS_INFORMATION: "bg-rose-50 text-rose-600 ring-[#f7d3d9]",
  APPROVED: "bg-brand-100 text-brand-700 ring-brand-200",
  REJECTED: "bg-rose-50 text-rose-600 ring-[#f7d3d9]",
  MANUALLY_ANSWERED: "bg-[#e9f3ff] text-[#21629b] ring-[#cfe4fa]",
  UNANSWERED: "bg-mist-100 text-ink-600 ring-mist-200",
  PUBLIC: "bg-brand-100 text-brand-700 ring-brand-200",
  SHARED_SUMMARY: "bg-[#e9f3ff] text-[#21629b] ring-[#cfe4fa]",
  CONFIDENTIAL: "bg-amber-50 text-amber-600 ring-[#f7dfab]",
  RESTRICTED: "bg-rose-50 text-rose-600 ring-[#f7d3d9]"
};

export function StatusBadge({
  status,
  className
}: {
  status: ControlStatus | QuestionnaireStatus | AnswerStatus;
  className?: string;
}) {
  const label =
    status in controlStatusLabel
      ? controlStatusLabel[status as ControlStatus]
      : status in questionnaireStatusLabel
        ? questionnaireStatusLabel[status as QuestionnaireStatus]
        : answerStatusLabel[status as AnswerStatus];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        tones[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

export function ConfidentialityBadge({ level }: { level: Confidentiality }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        tones[level]
      )}
    >
      {confidentialityLabel[level]}
    </span>
  );
}
