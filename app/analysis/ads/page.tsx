"use client";

import { AlertTriangle, DollarSign, Loader2, Printer, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
  getDailyEntriesInRange,
  subscribeAdsAccounts,
  subscribeBusinessAccounts,
  subscribeGmailAccounts,
} from "@/lib/firestore-helpers";
import {
  CPA_THRESHOLD,
  aggregateEntriesByAccount,
  aggregateEntriesByDate,
  formatCurrency,
} from "@/lib/utils";
import type { AdsAccount, AdsStatus, BusinessAccount, DailyEntry, GmailAccount } from "@/types";

const STATUS_OPTIONS: { id: AdsStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "blocked", label: "Blocked" },
  { id: "closed", label: "Closed" },
];

export default function AdsAnalysisPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-navy">
          <Loader2 className="animate-spin text-white/70" size={22} />
        </main>
      }
    >
      <AdsAnalysisContent />
    </Suspense>
  );
}

function AdsAnalysisContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
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
  const [adsFilter, setAdsFilter] = useState<SelectionState>(() => {
    const id = searchParams.get("adsAccountId");
    return id ? new Set([id]) : "all";
  });
  const [statusFilter, setStatusFilter] = useState<SelectionState>("all");

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
    const unsub3 = subscribeAdsAccounts(setAdsAccounts);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDailyEntriesInRange(range.start, range.end)
      .then(setEntries)
      .finally(() => setFetching(false));
  }, [user, range.start, range.end]);

  const adsStatusById = useMemo(() => {
    const map = new Map<string, AdsStatus>();
    adsAccounts.forEach((a) => map.set(a.id, a.status));
    return map;
  }, [adsAccounts]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!isIncluded(gmailFilter, e.gmailAccountId)) return false;
      if (!isIncluded(businessFilter, e.businessAccountId)) return false;
      if (!isIncluded(adsFilter, e.adsAccountId)) return false;
      const status = adsStatusById.get(e.adsAccountId);
      if (status && !isIncluded(statusFilter, status)) return false;
      return true;
    });
  }, [entries, gmailFilter, businessFilter, adsFilter, statusFilter, adsStatusById]);

  const dateSeries = useMemo(() => aggregateEntriesByDate(filteredEntries), [filteredEntries]);
  const accountSeries = useMemo(
    () => aggregateEntriesByAccount(filteredEntries).slice(0, 12),
    [filteredEntries]
  );

  const totals = useMemo(() => {
    const spend = filteredEntries.reduce((s, e) => s + e.spend, 0);
    const avgCpa = filteredEntries.length
      ? filteredEntries.reduce((s, e) => s + e.cpa, 0) / filteredEntries.length
      : 0;
    const flaggedDays = filteredEntries.filter((e) => e.cpa > CPA_THRESHOLD).length;
    return { spend, avgCpa, flaggedDays, entryCount: filteredEntries.length };
  }, [filteredEntries]);

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
          <h1 className="font-display text-xl font-bold text-ink">Ads Account Analysis</h1>
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
          <MultiSelectFilter
            label="Ads Accounts"
            options={adsAccounts.map((a) => ({ id: a.id, label: a.name }))}
            selected={adsFilter}
            onChange={setAdsFilter}
          />
          <MultiSelectFilter
            label="Statuses"
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <DateRangeFilter range={range} onChange={setRange} />

        <div className="hidden print:block">
          <p className="font-display text-base font-bold text-ink">DavoPay Ads Manager — Ads Analysis</p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatCurrency(totals.spend)} spent · avg CPA {formatCurrency(totals.avgCpa)}
          </p>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <p className="font-display text-base font-semibold text-ink">No daily entries in this range</p>
            <p className="mt-1 text-sm text-ink-soft">
              Log spend from the dashboard, or try a wider date range or different filters.
            </p>
          </div>
        ) : (
          <>
            <div className="print-area grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={DollarSign} label="Total Spend" value={formatCurrency(totals.spend)} tone="text-primary" />
              <StatCard icon={TrendingUp} label="Average CPA" value={formatCurrency(totals.avgCpa)} tone="text-navy" />
              <StatCard icon={AlertTriangle} label="High-CPA Entries" value={String(totals.flaggedDays)} tone="text-danger" />
              <StatCard icon={DollarSign} label="Entries Logged" value={String(totals.entryCount)} tone="text-success" />
            </div>

            <ChartCard title="Spend over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dateSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#56617A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#56617A" }} width={70} tickFormatter={(v) => `₦${v}`} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                  <Line type="monotone" dataKey="spend" stroke="#0051cf" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cost per result (CPA) over time" subtitle={`Red line = your ${formatCurrency(CPA_THRESHOLD)} pause threshold`}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dateSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#56617A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#56617A" }} width={70} tickFormatter={(v) => `₦${v}`} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                  <ReferenceLine y={CPA_THRESHOLD} stroke="#dc2626" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="avgCpa" stroke="#173b8c" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Spend by ads account">
              <ResponsiveContainer width="100%" height={Math.max(220, accountSeries.length * 34)}>
                <BarChart data={accountSeries} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#56617A" }} tickFormatter={(v) => `₦${v}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#56617A" }} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                  <Bar dataKey="spend" fill="#0051cf" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
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
  icon: typeof DollarSign;
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

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-area rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
