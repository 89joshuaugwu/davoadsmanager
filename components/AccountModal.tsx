"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  addDailyEntry,
  addFundingToBusinessAccount,
  createAdsAccount,
  createBusinessAccount,
  createGmailAccount,
  updateAdsAccount,
  updateBusinessAccount,
  updateGmailAccount,
} from "@/lib/firestore-helpers";
import { encryptPassword } from "@/lib/vault";
import type { AdsAccount, BusinessAccount, Card, GmailAccount } from "@/types";

export type ModalMode =
  | { kind: "add-gmail" }
  | { kind: "edit-gmail"; gmail: GmailAccount }
  | { kind: "add-business"; gmailAccountId: string; gmailEmail: string }
  | { kind: "edit-business"; business: BusinessAccount }
  | { kind: "add-funding"; business: BusinessAccount; gmailEmail: string }
  | { kind: "add-ads"; businessAccountId: string; gmailAccountId: string }
  | { kind: "edit-ads"; ads: AdsAccount }
  | { kind: "add-daily-entry"; ads: AdsAccount; businessName: string; gmailEmail: string };

const TITLES: Record<ModalMode["kind"], string> = {
  "add-gmail": "Add Gmail Account",
  "edit-gmail": "Edit Gmail Account",
  "add-business": "Add Business Account",
  "edit-business": "Edit Business Account",
  "add-funding": "Add Funding",
  "add-ads": "Add Ads Account",
  "edit-ads": "Edit Ads Account",
  "add-daily-entry": "Log Daily Spend",
};

function todayInputDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatInputDate(ts?: number): string {
  if (!ts) return todayInputDate();
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AccountModal({
  mode,
  cards,
  onClose,
}: {
  mode: ModalMode | null;
  cards: Card[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mode) return;
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);

    try {
      switch (mode.kind) {
        case "add-gmail": {
          const password = String(form.get("password") ?? "");
          const encryptedPassword = await encryptPassword(password);
          const createdAtStr = String(form.get("createdAt") ?? "");
          await createGmailAccount({
            email: String(form.get("email") ?? "").trim(),
            encryptedPassword,
            tiktokAccountName: String(form.get("tiktokAccountName") ?? "").trim(),
            tiktokManagerName: String(form.get("tiktokManagerName") ?? "").trim(),
            notes: String(form.get("notes") ?? "").trim(),
            createdAt: createdAtStr ? new Date(createdAtStr + "T12:00:00").getTime() : undefined,
          });
          break;
        }
        case "edit-gmail": {
          const newPassword = String(form.get("password") ?? "").trim();
          const createdAtStr = String(form.get("createdAt") ?? "");
          const patch: Parameters<typeof updateGmailAccount>[1] = {
            email: String(form.get("email") ?? "").trim(),
            tiktokAccountName: String(form.get("tiktokAccountName") ?? "").trim(),
            tiktokManagerName: String(form.get("tiktokManagerName") ?? "").trim(),
            notes: String(form.get("notes") ?? "").trim(),
          };
          if (createdAtStr) {
            patch.createdAt = new Date(createdAtStr + "T12:00:00").getTime();
          }
          if (newPassword) {
            patch.encryptedPassword = await encryptPassword(newPassword);
          }
          await updateGmailAccount(mode.gmail.id, patch);
          break;
        }
        case "add-business": {
          const createdAtStr = String(form.get("createdAt") ?? "");
          await createBusinessAccount(mode.gmailAccountId, mode.gmailEmail, {
            name: String(form.get("name") ?? "").trim(),
            officialDomain: String(form.get("officialDomain") ?? "").trim(),
            initialFunding: Number(form.get("initialFunding") ?? 0),
            createdAt: createdAtStr ? new Date(createdAtStr + "T12:00:00").getTime() : undefined,
          });
          break;
        }
        case "edit-business": {
          const createdAtStr = String(form.get("createdAt") ?? "");
          const patch: Parameters<typeof updateBusinessAccount>[1] = {
            name: String(form.get("name") ?? "").trim(),
            officialDomain: String(form.get("officialDomain") ?? "").trim(),
          };
          if (createdAtStr) patch.createdAt = new Date(createdAtStr + "T12:00:00").getTime();
          await updateBusinessAccount(mode.business.id, patch);
          break;
        }
        case "add-funding": {
          const cardId = String(form.get("cardId") ?? "");
          const card = cards.find((c) => c.id === cardId);
          await addFundingToBusinessAccount(
            mode.business,
            mode.gmailEmail,
            Number(form.get("amount") ?? 0),
            String(form.get("note") ?? "").trim(),
            card ? { id: card.id, name: card.name, lastFourDigits: card.lastFourDigits } : undefined
          );
          break;
        }
        case "add-ads": {
          const createdAtStr = String(form.get("createdAt") ?? "");
          await createAdsAccount(mode.businessAccountId, mode.gmailAccountId, {
            name: String(form.get("name") ?? "").trim(),
            destinationUrl: String(form.get("destinationUrl") ?? "").trim(),
            createdAt: createdAtStr ? new Date(createdAtStr + "T12:00:00").getTime() : undefined,
          });
          break;
        }
        case "edit-ads": {
          const createdAtStr = String(form.get("createdAt") ?? "");
          const patch: Parameters<typeof updateAdsAccount>[1] = {
            name: String(form.get("name") ?? "").trim(),
            destinationUrl: String(form.get("destinationUrl") ?? "").trim(),
            adStatus: form.get("adStatus") === "created" ? "created" : "not_created",
          };
          if (createdAtStr) patch.createdAt = new Date(createdAtStr + "T12:00:00").getTime();
          await updateAdsAccount(mode.ads.id, patch);
          break;
        }
        case "add-daily-entry": {
          const dateStr = String(form.get("date") ?? "");
          await addDailyEntry(
            mode.ads,
            { name: mode.businessName },
            mode.gmailEmail,
            {
              date: new Date(dateStr + "T12:00:00").getTime(),
              spend: Number(form.get("spend") ?? 0),
              cpa: Number(form.get("cpa") ?? 0),
              note: String(form.get("note") ?? "").trim(),
            }
          );
          break;
        }
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
              <h2 className="font-display text-lg font-bold text-ink">{TITLES[mode.kind]}</h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-neutral-soft"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <ModalFields mode={mode} cards={cards} />

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary";

function ModalFields({ mode, cards }: { mode: ModalMode; cards: Card[] }) {
  switch (mode.kind) {
    case "add-gmail":
    case "edit-gmail": {
      const g = mode.kind === "edit-gmail" ? mode.gmail : undefined;
      return (
        <>
          <Field label="Gmail address">
            <input name="email" type="email" required defaultValue={g?.email} className={inputClass} />
          </Field>
          <Field label={g ? "New password (leave blank to keep current)" : "Password"}>
            <input
              name="password"
              type="text"
              required={!g}
              placeholder={g ? "••••••••" : ""}
              className={inputClass}
            />
          </Field>
          <Field label="TikTok account name (optional)">
            <input name="tiktokAccountName" defaultValue={g?.tiktokAccountName} className={inputClass} />
          </Field>
          <Field label="TikTok manager account (optional)">
            <input name="tiktokManagerName" defaultValue={g?.tiktokManagerName} className={inputClass} />
          </Field>
          <Field label="Notes (optional)">
            <textarea name="notes" defaultValue={g?.notes} rows={2} className={inputClass} />
          </Field>
          <Field label="Created Date">
            <input name="createdAt" type="date" required defaultValue={formatInputDate(g?.createdAt)} max={todayInputDate()} className={inputClass} />
          </Field>
        </>
      );
    }

    case "add-business":
    case "edit-business": {
      const b = mode.kind === "edit-business" ? mode.business : undefined;
      return (
        <>
          <Field label="Business account name">
            <input name="name" required defaultValue={b?.name} className={inputClass} placeholder="e.g. Form Ads Manager" />
          </Field>
          <Field label="Official domain (optional)">
            <input name="officialDomain" defaultValue={b?.officialDomain} className={inputClass} />
          </Field>
          <Field label="Created Date">
            <input name="createdAt" type="date" required defaultValue={formatInputDate(b?.createdAt)} max={todayInputDate()} className={inputClass} />
          </Field>
          {!b && (
            <Field label="Initial funding (optional)">
              <input name="initialFunding" type="number" min={0} step="0.01" defaultValue={0} className={inputClass} />
            </Field>
          )}
        </>
      );
    }

    case "add-funding": {
      const linkedCards = cards.filter((c) => (c.businessAccountId === mode.business.id || !c.businessAccountId) && c.status === "active");
      return (
        <>
          <p className="text-sm text-ink-soft">
            Adding to <span className="font-semibold text-ink">{mode.business.name}</span>
          </p>
          <Field label="Amount">
            <input name="amount" type="number" min={0.01} step="0.01" required autoFocus className={inputClass} />
          </Field>
          <Field label="Card used (optional)">
            <select name="cardId" defaultValue="" className={inputClass}>
              <option value="">No card / other method</option>
              {linkedCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} •••• {c.lastFourDigits}
                </option>
              ))}
            </select>
            {linkedCards.length === 0 && (
              <p className="mt-1.5 text-xs text-ink-soft">
                No active cards available — manage cards from the sidebar.
              </p>
            )}
          </Field>
          <Field label="Note (optional)">
            <input name="note" className={inputClass} placeholder="e.g. Top-up via bank transfer" />
          </Field>
        </>
      );
    }

    case "add-ads":
    case "edit-ads": {
      const a = mode.kind === "edit-ads" ? mode.ads : undefined;
      return (
        <>
          <Field label="Ads account name">
            <input name="name" required defaultValue={a?.name} className={inputClass} placeholder="e.g. Form1" />
          </Field>
          <Field label="Destination / bridge URL (optional)">
            <input name="destinationUrl" defaultValue={a?.destinationUrl} className={inputClass} />
          </Field>
          <Field label="Created Date">
            <input name="createdAt" type="date" required defaultValue={formatInputDate(a?.createdAt)} max={todayInputDate()} className={inputClass} />
          </Field>
          {a && (
            <Field label="Ad creation status">
              <select name="adStatus" defaultValue={a.adStatus} className={inputClass}>
                <option value="not_created">Not created</option>
                <option value="created">Created</option>
              </select>
            </Field>
          )}
        </>
      );
    }

    case "add-daily-entry":
      return (
        <>
          <p className="text-sm text-ink-soft">
            Logging a day for <span className="font-semibold text-ink">{mode.ads.name}</span> · running
            total so far: <span className="font-semibold text-ink">₦{mode.ads.amountSpent.toLocaleString()}</span>
          </p>
          <Field label="Date">
            <input name="date" type="date" required defaultValue={todayInputDate()} max={todayInputDate()} className={inputClass} />
          </Field>
          <Field label="Amount spent that day">
            <input name="spend" type="number" min={0} step="0.01" required autoFocus defaultValue={0} className={inputClass} />
          </Field>
          <Field label="Cost per result (CPR) that day">
            <input name="cpa" type="number" min={0} step="0.01" required defaultValue={mode.ads.cpa} className={inputClass} />
          </Field>
          <Field label="Note (optional)">
            <input name="note" className={inputClass} placeholder="e.g. Creative refreshed" />
          </Field>
        </>
      );
  }
}
