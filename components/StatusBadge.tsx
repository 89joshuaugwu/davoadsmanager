import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdsStatus, BusinessStatus, GmailStatus } from "@/types";

type Status = GmailStatus | BusinessStatus | AdsStatus;

const STYLES: Record<Status, string> = {
  active: "bg-success-soft text-success",
  paused: "bg-warning-soft text-warning",
  blocked: "bg-danger-soft text-danger",
  closed: "bg-neutral-soft text-neutral",
  disabled: "bg-neutral-soft text-neutral",
};

const LABELS: Record<Status, string> = {
  active: "Active",
  paused: "Paused",
  blocked: "Blocked",
  closed: "Closed",
  disabled: "Disabled",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}

export function ElevatedCpaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-white">
      <AlertTriangle size={12} strokeWidth={2.5} />
      ELEVATED CPR
    </span>
  );
}

export function HighCpaBadge() {
  return (
    <span className="animate-flag-pulse inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
      <AlertTriangle size={12} strokeWidth={2.5} />
      HIGH CPR — PAUSE
    </span>
  );
}
