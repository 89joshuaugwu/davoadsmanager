"use client";

import { LayoutGrid, ListTree, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountCards } from "@/components/AccountCards";
import { AccountModal, type ModalMode } from "@/components/AccountModal";
import { AccountTree, type TreeCallbacks } from "@/components/AccountTree";
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

type ViewMode = "tree" | "cards";
type PendingAction =
  | { kind: "delete-gmail"; gmail: GmailAccount }
  | { kind: "delete-business"; business: BusinessAccount }
  | { kind: "close-business"; business: BusinessAccount; gmailEmail: string }
  | { kind: "delete-ads"; ads: AdsAccount };

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("tree");
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
    });
    const unsub2 = subscribeBusinessAccounts((rows) => {
      setBusinessAccounts(rows);
      markLoaded();
    });
    const unsub3 = subscribeAdsAccounts((rows) => {
      setAdsAccounts(rows);
      markLoaded();
    });
    const unsub4 = subscribeCards((rows) => {
      setCards(rows);
      markLoaded();
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [user]);

  const tree = useMemo(
    () => buildAccountTree(gmailAccounts, businessAccounts, adsAccounts),
    [gmailAccounts, businessAccounts, adsAccounts]
  );
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
    onAddAds: (businessAccountId, gmailAccountId) =>
      setModalMode({ kind: "add-ads", businessAccountId, gmailAccountId }),
    onEditAds: (a) => setModalMode({ kind: "edit-ads", ads: a }),
    onDeleteAds: (a) => setPendingAction({ kind: "delete-ads", ads: a }),
    onLogSpend: (a, businessName, gmailEmail) =>
      setModalMode({ kind: "add-daily-entry", ads: a, businessName, gmailEmail }),
    onUpdateAdsStatus: (a, status: AdsStatus) =>
      updateAdsAccountStatus(a.id, status, status === "paused" ? "Paused — high CPA" : "Blocked"),
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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <FinancialSummary summary={summary} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
            <ViewToggleButton active={view === "tree"} onClick={() => setView("tree")} icon={ListTree} label="Tree" />
            <ViewToggleButton active={view === "cards"} onClick={() => setView("cards")} icon={LayoutGrid} label="Cards" />
          </div>

          <button
            onClick={() => setModalMode({ kind: "add-gmail" })}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Plus size={16} /> Add Gmail Account
          </button>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-ink-soft" size={22} />
          </div>
        ) : view === "tree" ? (
          <AccountTree gmailAccounts={tree} callbacks={callbacks} />
        ) : (
          <AccountCards gmailAccounts={tree} callbacks={callbacks} />
        )}
      </div>

      <AccountModal mode={modalMode} cards={cards} onClose={() => setModalMode(null)} />

      <ConfirmDialog
        open={pendingAction !== null}
        title={confirmTitle(pendingAction)}
        description={confirmDescription(pendingAction)}
        confirmLabel={pendingAction?.kind === "close-business" ? "Close account" : "Delete"}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </AppShell>
  );
}

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
