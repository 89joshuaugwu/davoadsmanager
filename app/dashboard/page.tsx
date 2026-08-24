"use client";

import { Activity, ArrowUpRight, Gauge, LayoutGrid, ListTree, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountCards } from "@/components/AccountCards";
import { AccountModal, type ModalMode } from "@/components/AccountModal";
import { AccountTree, type TreeCallbacks } from "@/components/AccountTree";
import { AdsDetailsView } from "@/components/AdsDetailsView";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FinancialSummary } from "@/components/FinancialSummary";
import { useAuth } from "@/context/AuthContext";
import {
  deleteAdsAccount,
  deleteBusinessAccount,
  deleteGmailAccount,
  closeBusinessAccount,
  subscribeAdsAccounts,
  subscribeBusinessAccounts,
  subscribeCards,
  subscribeGmailAccounts,
  updateAdsAccountStatus,
} from "@/lib/firestore-helpers";
import { buildAccountTree, cn, computeSummary } from "@/lib/utils";
import type { AdsAccount, AdsStatus, BusinessAccount, Card, GmailAccount } from "@/types";

type ViewMode = "tree" | "cards" | "ads-details";
type PendingAction =
  | { kind: "delete-gmail"; gmail: GmailAccount }
  | { kind: "delete-business"; business: BusinessAccount }
  | { kind: "close-business"; business: BusinessAccount; gmailEmail: string }
  | { kind: "delete-ads"; ads: AdsAccount };

export default function DashboardPage() {
  const { user, profile, loading, viewedWorkspaceId, isReadOnlyView } = useAuth();
  const router = useRouter();

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("tree");
  const [adStatusFilter, setAdStatusFilter] = useState<"all" | "created" | "not_created">("all");
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let loaded = 0;
    const markLoaded = () => {
      loaded += 1;
      if (loaded >= 4) setDataLoading(false);
    };
    const unsub1 = subscribeGmailAccounts((rows) => {
      setGmailAccounts(rows);
      markLoaded();
    }, viewedWorkspaceId);
    const unsub2 = subscribeBusinessAccounts((rows) => {
      setBusinessAccounts(rows);
      markLoaded();
    }, viewedWorkspaceId);
    const unsub3 = subscribeAdsAccounts((rows) => {
      setAdsAccounts(rows);
      markLoaded();
    }, viewedWorkspaceId);
    const unsub4 = subscribeCards((rows) => {
      setCards(rows);
      markLoaded();
    }, viewedWorkspaceId);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [user, viewedWorkspaceId]);

  const tree = useMemo(() => {
    const filteredAds = adStatusFilter === "all" ? adsAccounts : adsAccounts.filter((a) => a.adStatus === adStatusFilter);
    return buildAccountTree(gmailAccounts, businessAccounts, filteredAds);
  }, [gmailAccounts, businessAccounts, adsAccounts, adStatusFilter]);
  const summary = useMemo(
    () => computeSummary(businessAccounts, adsAccounts),
    [businessAccounts, adsAccounts]
  );

  const callbacks: TreeCallbacks = {
    onEditGmail: (g) => setModalMode({ kind: "edit-gmail", gmail: g }),
    onDeleteGmail: (g) => setPendingAction({ kind: "delete-gmail", gmail: g }),
    onAddBusiness: (gmailId, gmailEmail) =>
      setModalMode({ kind: "add-business", gmailAccountId: gmailId, gmailEmail }),
    onEditBusiness: (b) => setModalMode({ kind: "edit-business", business: b }),
    onDeleteBusiness: (b) => setPendingAction({ kind: "delete-business", business: b }),
    onAddFunding: (b, gmailEmail) => setModalMode({ kind: "add-funding", business: b, gmailEmail }),
    onCloseBusiness: (b, gmailEmail) =>
      setPendingAction({ kind: "close-business", business: b, gmailEmail }),
    onAddAds: (businessAccountId, gmailAccountId, businessCreatedAt) =>
      setModalMode({ kind: "add-ads", businessAccountId, gmailAccountId, defaultDate: businessCreatedAt }),
    onEditAds: (a) => setModalMode({ kind: "edit-ads", ads: a }),
    onDeleteAds: (a) => setPendingAction({ kind: "delete-ads", ads: a }),
    onLogSpend: (a, businessName, gmailEmail) =>
      setModalMode({ kind: "add-daily-entry", ads: a, businessName, gmailEmail }),
    onUpdateAdsStatus: (a, status: AdsStatus) =>
      updateAdsAccountStatus(a.id, status, status === "paused" ? "Paused — high CPR" : "Blocked"),
  };

  async function confirmPendingAction() {
    if (!pendingAction) return;
    switch (pendingAction.kind) {
      case "delete-gmail":
        await deleteGmailAccount(pendingAction.gmail.id);
        break;
      case "delete-business":
        await deleteBusinessAccount(pendingAction.business.id);
        break;
      case "close-business":
        await closeBusinessAccount(pendingAction.business, pendingAction.gmailEmail);
        break;
      case "delete-ads":
        await deleteAdsAccount(pendingAction.ads.id);
        break;
    }
    setPendingAction(null);
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
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7">
        <section className="animate-dashboard-enter overflow-hidden rounded-[1.65rem] bg-navy px-5 py-6 text-white shadow-[0_18px_45px_rgba(23,59,140,.20)] sm:px-7 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/60">Live workspace overview</p><h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Good to see you, {profile?.displayName?.split(" ")[0] || "there"}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Keep funding, daily spend, account health, and performance decisions in one calm command centre.</p></div>
            <div className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-white/[.07] p-3 backdrop-blur-sm sm:min-w-[25rem]"><HeroMetric label="Gmail" value={gmailAccounts.length} /><HeroMetric label="Businesses" value={businessAccounts.length} /><HeroMetric label="Ad accounts" value={adsAccounts.length} /></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">{isReadOnlyView ? <span className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white">Viewing this member&apos;s records — read only</span> : <button onClick={() => setModalMode({ kind: "add-gmail" })} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-navy transition hover:-translate-y-0.5 hover:bg-primary-soft"><Plus size={16} /> Add account</button>}<button onClick={() => setView("ads-details")} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><Gauge size={16} /> Review ad health <ArrowUpRight size={15} /></button></div>
        </section>
        <FinancialSummary summary={summary} />

        <section className="app-surface animate-dashboard-enter p-3 sm:p-4" style={{ animationDelay: "90ms" }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary"><Activity size={16} /></span><div><p className="font-display text-base font-bold text-ink">Account workspace</p><p className="text-xs text-ink-soft">Manage account structure and log spend as it happens.</p></div></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line bg-canvas/70 p-1">
              <ViewToggleButton active={view === "tree"} onClick={() => setView("tree")} icon={ListTree} label="Tree" />
              <ViewToggleButton active={view === "cards"} onClick={() => setView("cards")} icon={LayoutGrid} label="Cards" />
              <ViewToggleButton active={view === "ads-details"} onClick={() => setView("ads-details")} icon={LayoutGrid} label="Ads Details" />
            </div>

            <select
              value={adStatusFilter}
              onChange={(e) => setAdStatusFilter(e.target.value as "all" | "created" | "not_created")}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-primary"
            >
              <option value="all">All Ad Statuses</option>
              <option value="created">Ad created</option>
              <option value="not_created">Ad not created</option>
            </select>
          </div>

          {!isReadOnlyView && <button
            onClick={() => setModalMode({ kind: "add-gmail" })}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,81,207,.20)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            <Plus size={16} /> Add Gmail Account
          </button>}
        </div></section>

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : view === "tree" ? (
          <AccountTree gmailAccounts={tree} callbacks={isReadOnlyView ? undefined : callbacks} />
        ) : view === "cards" ? (
          <AccountCards gmailAccounts={tree} callbacks={isReadOnlyView ? undefined : callbacks} />
        ) : (
          <AdsDetailsView adsAccounts={adsAccounts} />
        )}
      </div>

      {!isReadOnlyView && <AccountModal mode={modalMode} cards={cards} onClose={() => setModalMode(null)} />}

      {!isReadOnlyView && <ConfirmDialog
        open={pendingAction !== null}
        title={confirmTitle(pendingAction)}
        description={confirmDescription(pendingAction)}
        confirmLabel={pendingAction?.kind === "close-business" ? "Close account" : "Delete"}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />}
    </AppShell>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) { return <div className="px-3 text-center"><p className="font-display text-lg font-extrabold sm:text-xl">{value}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">{label}</p></div>; }

function ViewToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ListTree;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition",
        active ? "bg-navy text-white" : "text-ink-soft hover:bg-neutral-soft"
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function confirmTitle(action: PendingAction | null): string {
  if (!action) return "";
  switch (action.kind) {
    case "delete-gmail":
      return "Delete this Gmail account?";
    case "delete-business":
      return "Delete this business account?";
    case "close-business":
      return "Close this business account?";
    case "delete-ads":
      return "Delete this ads account?";
  }
}

function confirmDescription(action: PendingAction | null): string {
  if (!action) return "";
  switch (action.kind) {
    case "delete-gmail":
      return `This removes ${action.gmail.email} and every business/ads account under it. This can't be undone.`;
    case "delete-business":
      return `This removes "${action.business.name}" and every ads account under it. This can't be undone.`;
    case "close-business":
      return `Whatever funding hasn't been spent yet will be recorded as lost, and its ads accounts will be marked closed.`;
    case "delete-ads":
      return `This removes "${action.ads.name}" permanently. This can't be undone.`;
  }
}
