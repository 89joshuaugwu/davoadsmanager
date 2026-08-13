"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createCard, updateCard } from "@/lib/firestore-helpers";
import type { BusinessAccount, Card } from "@/types";

export type CardModalMode = { card?: Card } | null;

const inputClass =
  "w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary";

export function CardModal({
  mode,
  businessAccounts,
  onClose,
}: {
  mode: CardModalMode;
  businessAccounts: BusinessAccount[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = mode?.card;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mode) return;
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);

    try {
      const businessAccountId = String(form.get("businessAccountId") ?? "");
      const business = businessAccounts.find((b) => b.id === businessAccountId);
      const lastFourDigits = String(form.get("lastFourDigits") ?? "").trim();

      if (!/^\d{4}$/.test(lastFourDigits)) {
        throw new Error("Last 4 digits must be exactly 4 numbers.");
      }

      const payload = {
        name: String(form.get("name") ?? "").trim(),
        lastFourDigits,
        businessAccountId,
        businessName: business?.name ?? "",
        notes: String(form.get("notes") ?? "").trim(),
      };

      if (editing) {
        await updateCard(editing.id, {
          ...payload,
          status: (form.get("status") === "inactive" ? "inactive" : "active"),
        });
      } else {
        await createCard(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">
                {editing ? "Edit Card" : "Add Card"}
              </h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-neutral-soft"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Card name
                </span>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name}
                  placeholder="e.g. Access Bank Virtual Card 1"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Last 4 digits
                </span>
                <input
                  name="lastFourDigits"
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="\d{4}"
                  defaultValue={editing?.lastFourDigits}
                  placeholder="1234"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Linked business account
                </span>
                <select
                  name="businessAccountId"
                  defaultValue={editing?.businessAccountId ?? ""}
                  className={inputClass}
                >
                  <option value="">Not linked</option>
                  {businessAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              {editing && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Status
                  </span>
                  <select name="status" defaultValue={editing.status} className={inputClass}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Notes (optional)
                </span>
                <textarea name="notes" rows={2} defaultValue={editing?.notes} className={inputClass} />
              </label>

              {error && <p className="text-sm text-danger">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
