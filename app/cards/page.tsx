"use client";

import { motion } from "framer-motion";
import { Link2, Loader2, Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CardModal, type CardModalMode } from "@/components/CardModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import {
  deleteCard,
  getCardFundingTransactions,
  subscribeBusinessAccounts,
  subscribeCards,
} from "@/lib/firestore-helpers";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { BusinessAccount, Card, Transaction } from "@/types";

export default function CardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [cards, setCards] = useState<Card[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>(
    [],
  );
  const [totalsByCard, setTotalsByCard] = useState<Map<string, number>>(new Map());
  const [chargesByCard, setChargesByCard] = useState<Map<string, number>>(new Map());
  const [countByCard, setCountByCard] = useState<Map<string, number>>(new Map());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"cards" | "audit">("cards");
  const [dataLoading, setDataLoading] = useState(true);
  const [modalMode, setModalMode] = useState<CardModalMode>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let loaded = 0;
    const markLoaded = () => {
      loaded += 1;
      if (loaded >= 2) setDataLoading(false);
    };
    const unsub1 = subscribeCards((rows) => {
      setCards(rows);
      markLoaded();
    });
    const unsub2 = subscribeBusinessAccounts((rows) => {
      setBusinessAccounts(rows);
      markLoaded();
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getCardFundingTransactions().then((txs) => {
      const totals = new Map<string, number>();
      const charges = new Map<string, number>();
      const counts = new Map<string, number>();
      txs.forEach((t) => {
        if (!t.cardId) return;
        totals.set(t.cardId, (totals.get(t.cardId) ?? 0) + t.amount);
        charges.set(t.cardId, (charges.get(t.cardId) ?? 0) + (t.charge || 0));
        counts.set(t.cardId, (counts.get(t.cardId) ?? 0) + 1);
      });
      setTotalsByCard(totals);
      setChargesByCard(charges);
      setCountByCard(counts);
      setTransactions(txs.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [user, cards]);

  const sortedCards = useMemo(
    () => cards.slice().sort((a, b) => b.createdAt - a.createdAt),
    [cards],
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteCard(pendingDelete.id);
    setPendingDelete(null);
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="animate-spin text-white/70" size={22} />
      </main>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              Card Management
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              Track which cards fund which business accounts — and what&apos;s
              gone through each one.
            </p>
          </div>
          <button
            onClick={() => setModalMode({})}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Plus size={16} /> Add Card
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-line/60 p-1 max-w-fit">
          <button
            onClick={() => setActiveTab("cards")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold transition",
              activeTab === "cards" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            )}
          >
            Cards Grid
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold transition",
              activeTab === "audit" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            )}
          >
            Funding Audit Log
          </button>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : activeTab === "audit" ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas/50">
                    <th className="px-4 py-3 font-semibold text-ink-soft">Date</th>
                    <th className="px-4 py-3 font-semibold text-ink-soft">Card</th>
                    <th className="px-4 py-3 font-semibold text-ink-soft">Business Account</th>
                    <th className="px-4 py-3 text-right font-semibold text-ink-soft">Funded</th>
                    <th className="px-4 py-3 text-right font-semibold text-ink-soft">Charge</th>
                    <th className="px-4 py-3 text-right font-semibold text-ink-soft">Total Debit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transactions.map((tx) => {
                    const card = cards.find(c => c.id === tx.cardId);
                    const business = businessAccounts.find(b => b.id === tx.businessAccountId);
                    const amount = tx.amount || 0;
                    const charge = tx.charge || 0;
                    const debit = amount + charge;
                    return (
                      <tr key={tx.id} className="transition hover:bg-canvas/30">
                        <td className="px-4 py-3 text-ink">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-3 text-ink font-medium">{card?.name || "Unknown Card"}</td>
                        <td className="px-4 py-3 text-ink">{business?.name || "Unknown Business"}</td>
                        <td className="px-4 py-3 text-right text-ink font-medium">{formatCurrency(amount)}</td>
                        <td className="px-4 py-3 text-right text-warning">{formatCurrency(charge)}</td>
                        <td className="px-4 py-3 text-right text-ink font-bold">{formatCurrency(debit)}</td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No funding transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : sortedCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <p className="font-display text-base font-semibold text-ink">
              No cards yet
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Add a card to start linking it to a business account, or track it
              unlinked.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-navy p-4 text-white shadow-sm",
                  card.status === "inactive" && "opacity-60",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5"
                  aria-hidden
                />

                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-bold">
                    {card.name}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      card.status === "active"
                        ? "bg-success-soft text-success"
                        : "bg-white/10 text-white/70",
                    )}
                  >
                    {card.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="mt-1.5 font-mono text-sm tracking-widest text-white/60">
                  •••• {card.lastFourDigits}
                </p>

                <div className="mt-3.5">
                  {card.businessAccountId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-primary-soft">
                      <Link2 size={11} />{" "}
                      {card.businessName || "Linked business account"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/60">
                      <Unlink size={11} /> Not linked — funds any account
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-y-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                      Total funded
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold">
                      {formatCurrency(totalsByCard.get(card.id) ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                      Total charges
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold text-warning">
                      {formatCurrency(chargesByCard.get(card.id) ?? 0)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                      Total Debit
                    </p>
                    <p className="mt-0.5 font-display text-2xl font-bold text-white">
                      {formatCurrency((totalsByCard.get(card.id) ?? 0) + (chargesByCard.get(card.id) ?? 0))}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {countByCard.get(card.id) ?? 0} top-up
                      {(countByCard.get(card.id) ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {card.notes && (
                  <p className="mt-2.5 text-xs text-white/50">{card.notes}</p>
                )}

                <div className="relative mt-3.5 flex justify-end gap-1.5 border-t border-white/10 pt-3">
                  <button
                    onClick={() => setModalMode({ card })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(card)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CardModal
        mode={modalMode}
        businessAccounts={businessAccounts}
        onClose={() => setModalMode(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this card?"
        description={`This removes "${pendingDelete?.name}" from card management. Past funding records that used it are kept as-is.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  );
}
