"use client";

import { Loader2, PiggyBank, Printer, TrendingDown, Wallet } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import {
  getTransactionsInRange,
  subscribeBusinessAccounts,
  subscribeGmailAccounts,
} from "@/lib/firestore-helpers";
import { aggregateEntriesByDate, formatCurrency } from "@/lib/utils";
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
  const { user, loading } = useAuth();
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
    const unsub1 = subscribeGmailAccounts(setGmailAccounts);
    const unsub2 = subscribeBusinessAccounts(setBusinessAccounts);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getTransactionsInRange(range.start, range.end)
      .then(setTransactions)
      .finally(() => setFetching(false));
  }, [user, range.start, range.end]);

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

  const totals = useMemo(() => {
    const funded = fundingTx.reduce((s, t) => s + t.amount, 0);
    const lost = lossTx.reduce((s, t) => s + t.amount, 0);
    const businessesTouched = new Set(filtered.map((t) => t.businessAccountId).filter(Boolean)).size;
    return { funded, lost, businessesTouched };
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
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-ink">Business Center Analysis</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Printer size={16} /> Print / Export PDF
          </button>
        </div>

        <div className="no-print flex flex-wrap gap-2.5">
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
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <p className="font-display text-base font-semibold text-ink">No funding activity in this range</p>
            <p className="mt-1 text-sm text-ink-soft">Try a wider date range or different filters.</p>
          </div>
        ) : (
          <>
            <div className="print-area grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard icon={Wallet} label="Total Funded" value={formatCurrency(totals.funded)} tone="text-primary" />
              <StatCard icon={TrendingDown} label="Total Lost" value={formatCurrency(totals.lost)} tone="text-danger" />
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
