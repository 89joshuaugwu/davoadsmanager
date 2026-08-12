"use client";

import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  start: number;
  end: number;
  preset: RangePreset;
}

export function presetToRange(preset: RangePreset, customStart?: number, customEnd?: number): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime(), preset };
    case "week":
      return { start: startOfWeek(now).getTime(), end: endOfWeek(now).getTime(), preset };
    case "month":
      return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime(), preset };
    case "custom":
      return {
        start: customStart ?? startOfDay(now).getTime(),
        end: customEnd ?? endOfDay(now).getTime(),
        preset,
      };
  }
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

export function DateRangeFilter({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(presetToRange(p.key, range.start, range.end))}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            range.preset === p.key
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-neutral-soft"
          )}
        >
          {p.label}
        </button>
      ))}

      {range.preset === "custom" && (
        <div className="flex items-center gap-2 pl-2">
          <input
            type="date"
            value={toInputDate(range.start)}
            onChange={(e) =>
              onChange({ ...range, start: startOfDay(new Date(e.target.value)).getTime() })
            }
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
          />
          <span className="text-sm text-ink-soft">to</span>
          <input
            type="date"
            value={toInputDate(range.end)}
            onChange={(e) =>
              onChange({ ...range, end: endOfDay(new Date(e.target.value)).getTime() })
            }
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
          />
        </div>
      )}
    </div>
  );
}

function toInputDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
