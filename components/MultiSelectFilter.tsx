"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

/** "all" = every option included, with no explicit list to keep in sync as
 *  options change. A Set (even an empty one, meaning none picked) is an
 *  explicit choice the user made. */
export type SelectionState = "all" | Set<string>;

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: SelectionState;
  onChange: (selected: SelectionState) => void;
}

export function isIncluded(selected: SelectionState, id: string): boolean {
  return selected === "all" || selected.has(id);
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const allSelected = selected === "all";
  const selectedCount = allSelected ? options.length : selected.size;

  function toggle(id: string) {
    const next = new Set(allSelected ? options.map((o) => o.id) : selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next.size === options.length ? "all" : next);
  }

  const summary = allSelected ? `All ${label}` : `${selectedCount} of ${options.length} ${label}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition sm:w-56",
          open ? "border-primary text-primary" : "border-line text-ink hover:border-primary/40"
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={15} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="relative z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-lg sm:absolute sm:w-72">
          <div className="flex items-center justify-between gap-2 border-b border-line px-2 pb-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onChange("all")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-xs font-medium text-ink-soft hover:underline"
            >
              Clear
            </button>
          </div>

          {options.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-ink-soft">No options yet</p>
          )}

          {options.map((opt) => {
            const checked = isIncluded(selected, opt.id);
            return (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink transition hover:bg-neutral-soft"
              >
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border",
                    checked ? "border-primary bg-primary text-white" : "border-line"
                  )}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(opt.id)} />
                <span className="min-w-0 flex-1 truncate">
                  {opt.label}
                  {opt.sublabel && <span className="ml-1 text-xs text-ink-soft">{opt.sublabel}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
