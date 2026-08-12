"use client";

import { ArrowDownCircle, Loader2, Printer, TrendingDown, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter, presetToRange, type DateRange } from "@/components/DateRangeFilter";
import { Navbar } from "@/components/Navbar";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { getTransactionsInRange } from "@/lib/firestore-helpers";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Transaction } from "@/types";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  funding: "Funding",
  spend: "Spend",
  loss: "Loss",
};

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [range, setRangeValue] = useState<DateRange>(() => presetToRange("today"));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);

  function setRange(next: DateRange) {
    setFetching(true);
    setRangeValue(next);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getTransactionsInRange(range.start, range.end)
      .then(setTransactions)
      .finally(() => setFetching(false));
  }, [user, range.start, range.end]);

  const totals = useMemo(() => {
    const funded = transactions.filter((t) => t.type === "funding").reduce((s, t) => s + t.amount, 0);
    const spent = transactions.filter((t) => t.type === "spend").reduce((s, t) => s + t.amount, 0);
    const lost = transactions.filter((t) => t.type === "loss").reduce((s, t) => s + t.amount, 0);
    return { funded, spent, lost, net: funded - spent - lost };
  }, [transactions]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="animate-spin text-white/70" size={22} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <Navbar />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-ink">Reports</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Printer size={16} /> Print / Export PDF
          </button>
        </div>

        <DateRangeFilter range={range} onChange={setRange} />

        {/* print-only header, mirrors the on-screen summary in a clean report layout */}
        <div className="hidden print:block">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-auto" />
            <span className="font-display text-base font-bold text-ink">DavoPay Ads Manager</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Report period: {formatDate(range.start)} – {formatDate(range.end)}
          </p>
        </div>

        <div className="print-area rounded-2xl border border-line bg-white p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportStat icon={Wallet} label="Funded this period" value={totals.funded} tone="text-primary" />
            <ReportStat icon={ArrowDownCircle} label="Spent this period" value={totals.spent} tone="text-navy" />
            <ReportStat icon={TrendingDown} label="Lost this period" value={totals.lost} tone="text-danger" />
            <ReportStat icon={Wallet} label="Net change" value={totals.net} tone="text-success" />
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <p className="font-display text-base font-semibold text-ink">No activity in this range</p>
            <p className="mt-1 text-sm text-ink-soft">Try a wider date range.</p>
          </div>
        ) : (
          <div className="print-area overflow-hidden rounded-2xl border border-line bg-white">
            {/* Mobile: stacked cards */}
            <div className="divide-y divide-line sm:hidden print:hidden">
              {transactions.map((t) => (
                <div key={t.id} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{TYPE_LABEL[t.type]}</span>
                    <span
                      className={`text-sm font-bold ${
                        t.type === "funding"
                          ? "text-primary"
                          : t.type === "loss"
                            ? "text-danger"
                            : "text-navy"
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{formatDateTime(t.date)}</p>
                  <p className="mt-1 truncate text-xs text-ink-soft">
                    {t.gmailEmail}
                    {t.businessName ? ` · ${t.businessName}` : ""}
                    {t.adsName ? ` · ${t.adsName}` : ""}
                  </p>
                  {t.note && <p className="mt-1 text-xs italic text-ink-soft">{t.note}</p>}
                </div>
              ))}
            </div>

            {/* Desktop + print: table */}
            <table className="hidden w-full text-left text-sm sm:table print:table">
              <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Gmail</th>
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Ads account</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDateTime(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-ink">{TYPE_LABEL[t.type]}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-ink-soft">{t.gmailEmail}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-ink-soft">{t.businessName ?? "—"}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-ink-soft">{t.adsName ?? "—"}</td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                        t.type === "funding"
                          ? "text-primary"
                          : t.type === "loss"
                            ? "text-danger"
                            : "text-navy"
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-ink-soft">{t.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function ReportStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-canvas ${tone}`}>
        <Icon size={15} />
      </div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`font-display text-base font-bold sm:text-lg ${tone}`}>{formatCurrency(value)}</p>
    </div>
  );
}
