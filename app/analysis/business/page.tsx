"use client";

import { Loader2, PiggyBank, Printer, Receipt, TrendingDown, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, presetToRange, type DateRange } from "@/components/DateRangeFilter";
import { MultiSelectFilter, isIncluded, type SelectionState } from "@/components/MultiSelectFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import {
  getTransactionsInRange,
  subscribeBusinessAccounts,
  subscribeGmailAccounts,
} from "@/lib/firestore-helpers";
import { aggregateEntriesByDate, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { BusinessAccount, GmailAccount, Transaction } from "@/types";

const PIE_COLORS = ["#0051cf", "#173b8c", "#0f9d63", "#d97706", "#dc2626", "#6b7690"];

export default function BusinessAnalysisPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-navy">
          <Loader2 className="animate-spin text-white/70" size={22} />
        </main>
      }
    >
      <BusinessAnalysisContent />
    </Suspense>
  );
}

function BusinessAnalysisContent() {
  const { user, loading, viewedWorkspaceId, isReadOnlyView } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);

  const [range, setRangeValue] = useState<DateRange>(() => presetToRange("month"));
  const [gmailFilter, setGmailFilter] = useState<SelectionState>(() => {
    const id = searchParams.get("gmailAccountId");
    return id ? new Set([id]) : "all";
  });
  const [businessFilter, setBusinessFilter] = useState<SelectionState>(() => {
    const id = searchParams.get("businessAccountId");
    return id ? new Set([id]) : "all";
  });

  function setRange(next: DateRange) {
    setFetching(true);
    setRangeValue(next);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeGmailAccounts(setGmailAccounts, viewedWorkspaceId);
    const unsub2 = subscribeBusinessAccounts(setBusinessAccounts, viewedWorkspaceId);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user, viewedWorkspaceId]);

  useEffect(() => {
    if (!user) return;
    getTransactionsInRange(range.start, range.end, viewedWorkspaceId)
      .then(setTransactions)
      .finally(() => setFetching(false));
  }, [user, range.start, range.end, viewedWorkspaceId]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!isIncluded(gmailFilter, t.gmailAccountId)) return false;
      if (t.businessAccountId && !isIncluded(businessFilter, t.businessAccountId)) return false;
      return true;
    });
  }, [transactions, gmailFilter, businessFilter]);

  const fundingTx = useMemo(() => filtered.filter((t) => t.type === "funding"), [filtered]);
  const lossTx = useMemo(() => filtered.filter((t) => t.type === "loss"), [filtered]);

  const fundingByDate = useMemo(
    () => aggregateEntriesByDate(fundingTx.map((t) => ({ date: t.date, spend: t.amount, cpa: 0 }))),
    [fundingTx]
  );

  const fundingByBusiness = useMemo(() => {
    const map = new Map<string, { name: string; funded: number }>();
    fundingTx.forEach((t) => {
      if (!t.businessAccountId) return;
      const existing = map.get(t.businessAccountId) ?? { name: t.businessName ?? "—", funded: 0 };
      existing.funded += t.amount;
      map.set(t.businessAccountId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.funded - a.funded);
  }, [fundingTx]);

  const filteredBusinessAccounts = useMemo(() => {
    return businessAccounts.filter((b) => {
      if (!isIncluded(gmailFilter, b.gmailAccountId)) return false;
      if (!isIncluded(businessFilter, b.id)) return false;
      return true;
    });
  }, [businessAccounts, gmailFilter, businessFilter]);

  const gmailEmailById = useMemo(() => {
    const map = new Map<string, string>();
    gmailAccounts.forEach((g) => map.set(g.id, g.email));
    return map;
  }, [gmailAccounts]);

  const totals = useMemo(() => {
    const funded = fundingTx.reduce((s, t) => s + t.amount, 0);
    const lost = lossTx.reduce((s, t) => s + t.amount, 0);
    const charges = fundingTx.reduce((s, t) => s + (t.charge ?? 0), 0);
    const businessesTouched = new Set(filtered.map((t) => t.businessAccountId).filter(Boolean)).size;
    return { funded, lost, charges, businessesTouched };
  }, [fundingTx, lossTx, filtered]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="animate-spin text-white/70" size={22} />
      </main>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div><p className="eyebrow">Funding intelligence</p><h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">Business centre analysis</h1><p className="mt-1 text-sm text-ink-soft">Trace funding, charges, loss, and balance across every business account.</p></div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,81,207,.20)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            <Printer size={16} /> Print / Export PDF
          </button>
        </div>

        <div className="app-surface-muted no-print flex flex-wrap gap-2.5 p-3">
          <MultiSelectFilter
            label="Gmail Accounts"
            options={gmailAccounts.map((g) => ({ id: g.id, label: g.email }))}
            selected={gmailFilter}
            onChange={setGmailFilter}
          />
          <MultiSelectFilter
            label="Business Accounts"
            options={businessAccounts.map((b) => ({ id: b.id, label: b.name }))}
            selected={businessFilter}
            onChange={setBusinessFilter}
          />
        </div>

        <DateRangeFilter range={range} onChange={setRange} />

        <div className="hidden print:block">
          <p className="font-display text-base font-bold text-ink">DavoPay Ads Manager — Business Analysis</p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatCurrency(totals.funded)} funded · {formatCurrency(totals.lost)} lost
          </p>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
                <p className="font-display text-base font-semibold text-ink">No funding activity in this range</p>
                <p className="mt-1 text-sm text-ink-soft">Try a wider date range or different filters.</p>
              </div>
            ) : (
              <>
                <div className="print-area grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard icon={Wallet} label="Total Funded" value={formatCurrency(totals.funded)} tone="text-primary" />
                  <StatCard icon={TrendingDown} label="Total Lost" value={formatCurrency(totals.lost)} tone="text-danger" />
                  <StatCard icon={Receipt} label="Total Charges" value={formatCurrency(totals.charges)} tone="text-warning" />
                  <StatCard icon={PiggyBank} label="Business Accounts Touched" value={String(totals.businessesTouched)} tone="text-success" />
                </div>

                <ChartCard title="Funding over time">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={fundingByDate} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#56617A" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#56617A" }} width={70} tickFormatter={(v) => `₦${v}`} />
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                      <Line type="monotone" dataKey="spend" name="Funded" stroke="#0051cf" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ChartCard title="Funded per business account">
                    <ResponsiveContainer width="100%" height={Math.max(220, fundingByBusiness.length * 34)}>
                      <BarChart data={fundingByBusiness} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#56617A" }} tickFormatter={(v) => `₦${v}`} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#56617A" }} />
                        <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                        <Bar dataKey="funded" fill="#0051cf" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Funding distribution">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={fundingByBusiness}
                          dataKey="funded"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {fundingByBusiness.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <TableCard title="Funding Entries">
                  {/* Mobile: stacked cards */}
                  <div className="divide-y divide-line sm:hidden print:hidden">
                    {fundingTx.map((t) => (
                      <div key={t.id} className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{t.businessName ?? "—"}</p>
                          <span className="text-sm font-bold text-primary">{formatCurrency(t.amount)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {formatDateTime(t.date)}
                          {t.cardLabel ? ` · ${t.cardLabel}` : " · No card"}
                          {t.charge ? ` · Charge ${formatCurrency(t.charge)}` : ""}
                        </p>
                        {t.note && <p className="mt-1 text-xs italic text-ink-soft">{t.note}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Desktop + print: table */}
                  <table className="hidden w-full text-left text-sm sm:table print:table">
                    <thead className="text-xs uppercase tracking-wide text-ink-soft">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Business Center</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Card</th>
                        <th className="px-3 py-2 text-right font-semibold">Charge</th>
                        <th className="px-3 py-2 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {fundingTx.map((t) => (
                        <tr key={t.id}>
                          <td className="max-w-[160px] truncate px-3 py-2.5 font-medium text-ink">
                            {t.businessName ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-primary">
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{formatDate(t.date)}</td>
                          <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-soft">{t.cardLabel || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-warning">
                            {t.charge ? formatCurrency(t.charge) : "—"}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2.5 text-ink-soft">{t.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </>
            )}

            <TableCard title="Business Centers">
              {/* Mobile: stacked cards */}
              <div className="divide-y divide-line sm:hidden print:hidden">
                {filteredBusinessAccounts.map((b) => (
                  <div key={b.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{b.name}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {gmailEmailById.get(b.gmailAccountId) ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Funded {formatCurrency(b.amountFunded)} · {formatDate(b.dateFunded)}
                      {b.totalCharges ? ` · Charges ${formatCurrency(b.totalCharges)}` : ""}
                    </p>
                  </div>
                ))}
                {filteredBusinessAccounts.length === 0 && (
                  <p className="py-6 text-center text-xs text-ink-soft">No business accounts match these filters.</p>
                )}
              </div>

              {/* Desktop + print: table */}
              <table className="hidden w-full text-left text-sm sm:table print:table">
                <thead className="text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Gmail Account</th>
                    <th className="px-3 py-2 font-semibold">Business Center</th>
                    <th className="px-3 py-2 text-right font-semibold">Funded</th>
                    <th className="px-3 py-2 text-right font-semibold">Charges</th>
                    <th className="px-3 py-2 font-semibold">Date Funded</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredBusinessAccounts.map((b) => (
                    <tr key={b.id}>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-ink-soft">
                        {gmailEmailById.get(b.gmailAccountId) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-ink">{b.name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-primary">
                        {formatCurrency(b.amountFunded)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-warning">
                        {b.totalCharges ? formatCurrency(b.totalCharges) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{formatDate(b.dateFunded)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                  {filteredBusinessAccounts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-xs text-ink-soft">
                        No business accounts match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-canvas ${tone}`}>
        <Icon size={17} />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-area rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-area overflow-hidden rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      <div className="mt-1 overflow-x-auto">{children}</div>
    </div>
  );
}
