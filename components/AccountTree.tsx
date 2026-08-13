"use client";

import {
  BarChart3,
  ChevronDown,
  Globe,
  Mail,
  Pause,
  Pencil,
  Plus,
  ShieldOff,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PasswordReveal } from "@/components/PasswordReveal";
import { HighCpaBadge, StatusBadge } from "@/components/StatusBadge";
import {
  MAX_ADS_PER_BUSINESS,
  MAX_BUSINESS_PER_GMAIL,
  formatCurrency,
  formatDate,
  isHighCpa,
} from "@/lib/utils";
import type { AdsAccountNode, AdsStatus, BusinessAccountNode, GmailAccountNode } from "@/types";

export interface TreeCallbacks {
  onEditGmail: (g: GmailAccountNode) => void;
  onDeleteGmail: (g: GmailAccountNode) => void;
  onAddBusiness: (gmailId: string, gmailEmail: string) => void;
  onEditBusiness: (b: BusinessAccountNode) => void;
  onDeleteBusiness: (b: BusinessAccountNode) => void;
  onAddFunding: (b: BusinessAccountNode, gmailEmail: string) => void;
  onCloseBusiness: (b: BusinessAccountNode, gmailEmail: string) => void;
  onAddAds: (businessId: string, gmailId: string) => void;
  onEditAds: (a: AdsAccountNode) => void;
  onDeleteAds: (a: AdsAccountNode) => void;
  onLogSpend: (a: AdsAccountNode, businessName: string, gmailEmail: string) => void;
  onUpdateAdsStatus: (a: AdsAccountNode, status: AdsStatus) => void;
}

export function AccountTree({
  gmailAccounts,
  callbacks,
}: {
  gmailAccounts: GmailAccountNode[];
  callbacks: TreeCallbacks;
}) {
  if (gmailAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
        <p className="font-display text-base font-semibold text-ink">No Gmail accounts yet</p>
        <p className="mt-1 text-sm text-ink-soft">
          Add your first Gmail account to start tracking its TikTok Business and Ads accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gmailAccounts.map((g) => (
        <GmailNode key={g.id} gmail={g} callbacks={callbacks} />
      ))}
    </div>
  );
}

function GmailNode({ gmail, callbacks }: { gmail: GmailAccountNode; callbacks: TreeCallbacks }) {
  const [open, setOpen] = useState(true);
  const businessCount = gmail.businessAccounts.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left sm:gap-3"
        >
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
            <Mail size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-sm font-bold text-ink">{gmail.email}</p>
              <StatusBadge status={gmail.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-soft">
              {gmail.tiktokManagerName || gmail.tiktokAccountName || "No manager account name set"}
              {" · "}
              {businessCount}/{MAX_BUSINESS_PER_GMAIL} business accounts
            </p>
          </div>
        </button>

        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          <PasswordReveal encryptedPassword={gmail.encryptedPassword} />
          <IconLink href={`/analysis/ads?gmailAccountId=${gmail.id}`} label="View ads analysis for this Gmail">
            <BarChart3 size={15} />
          </IconLink>
          <IconButton onClick={() => callbacks.onEditGmail(gmail)} label="Edit Gmail account">
            <Pencil size={15} />
          </IconButton>
          <IconButton onClick={() => callbacks.onDeleteGmail(gmail)} label="Delete Gmail account" danger>
            <Trash2 size={15} />
          </IconButton>
          <ChevronDown
            size={18}
            className={`ml-auto shrink-0 cursor-pointer text-ink-soft transition-transform sm:ml-1 ${open ? "rotate-180" : ""}`}
            onClick={() => setOpen((v) => !v)}
          />
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas/60 p-3 pl-4 sm:p-4 sm:pl-8">
          <div className="space-y-3 border-l-2 border-primary-soft pl-3 sm:pl-5">
            {gmail.businessAccounts.map((b) => (
              <BusinessNode key={b.id} business={b} gmailEmail={gmail.email} callbacks={callbacks} />
            ))}

            {businessCount < MAX_BUSINESS_PER_GMAIL && (
              <button
                onClick={() => callbacks.onAddBusiness(gmail.id, gmail.email)}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary-soft"
              >
                <Plus size={14} /> Add Business Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessNode({
  business,
  gmailEmail,
  callbacks,
}: {
  business: BusinessAccountNode;
  gmailEmail: string;
  callbacks: TreeCallbacks;
}) {
  const [open, setOpen] = useState(true);
  const adsCount = business.adsAccounts.length;
  const totalSpent = business.adsAccounts.reduce((s, a) => s + a.amountSpent, 0);
  const remaining = business.amountFunded - totalSpent - business.amountLost;

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 p-3 sm:gap-3 sm:p-3.5">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-sm font-semibold text-ink">{business.name}</p>
              <StatusBadge status={business.status} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
              {business.officialDomain && (
                <span className="inline-flex items-center gap-1">
                  <Globe size={11} /> {business.officialDomain}
                </span>
              )}
              <span>Funded {formatCurrency(business.amountFunded)} on {formatDate(business.dateFunded)}</span>
              <span>{adsCount}/{MAX_ADS_PER_BUSINESS} ads accounts</span>
              <span className={remaining < 0 ? "font-semibold text-danger" : ""}>
                Remaining {formatCurrency(remaining)}
              </span>
            </p>
          </div>
        </button>

        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          <IconLink href={`/analysis/ads?businessAccountId=${business.id}`} label="View ads analysis for this business account">
            <BarChart3 size={15} />
          </IconLink>
          {business.status === "active" && (
            <>
              <IconButton onClick={() => callbacks.onAddFunding(business, gmailEmail)} label="Add funding">
                <Plus size={15} />
              </IconButton>
              <IconButton onClick={() => callbacks.onEditBusiness(business)} label="Edit business account">
                <Pencil size={15} />
              </IconButton>
              <IconButton
                onClick={() => callbacks.onCloseBusiness(business, gmailEmail)}
                label="Close business account"
                danger
              >
                <XCircle size={15} />
              </IconButton>
            </>
          )}
          <IconButton onClick={() => callbacks.onDeleteBusiness(business)} label="Delete business account" danger>
            <Trash2 size={15} />
          </IconButton>
          <ChevronDown
            size={16}
            className={`ml-auto shrink-0 cursor-pointer text-ink-soft transition-transform sm:ml-1 ${open ? "rotate-180" : ""}`}
            onClick={() => setOpen((v) => !v)}
          />
        </div>
      </div>

      {open && (
        <div className="border-t border-line p-3 pl-4 sm:p-3.5 sm:pl-6">
          <div className="space-y-2 border-l-2 border-navy-soft/20 pl-2.5 sm:pl-4">
            {business.adsAccounts.map((a) => (
              <AdsRow key={a.id} ads={a} businessName={business.name} gmailEmail={gmailEmail} callbacks={callbacks} />
            ))}

            {adsCount < MAX_ADS_PER_BUSINESS && business.status === "active" && (
              <button
                onClick={() => callbacks.onAddAds(business.id, business.gmailAccountId)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary-soft"
              >
                <Plus size={13} /> Add Ads Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdsRow({
  ads,
  businessName,
  gmailEmail,
  callbacks,
}: {
  ads: AdsAccountNode;
  businessName: string;
  gmailEmail: string;
  callbacks: TreeCallbacks;
}) {
  const flagged = isHighCpa(ads);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 rounded-lg border p-2.5 sm:gap-3 sm:p-3 ${
        flagged ? "border-danger/40 bg-danger-soft/40" : "border-line bg-canvas/50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{ads.name}</p>
          <StatusBadge status={ads.status} />
          <span
            className={`text-[11px] font-medium ${
              ads.adStatus === "created" ? "text-success" : "text-ink-soft"
            }`}
          >
            {ads.adStatus === "created" ? "Ad created" : "Ad not created"}
          </span>
          {flagged && <HighCpaBadge />}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          Spent {formatCurrency(ads.amountSpent)} · CPA {formatCurrency(ads.cpa)}
          {ads.invalidationReason ? ` · ${ads.invalidationReason}` : ""}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
        <button
          onClick={() => callbacks.onLogSpend(ads, businessName, gmailEmail)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary"
        >
          Log spend
        </button>
        <IconLink href={`/analysis/ads?adsAccountId=${ads.id}`} label="View analysis for this ads account">
          <BarChart3 size={14} />
        </IconLink>
        <IconButton onClick={() => callbacks.onEditAds(ads)} label="Edit ads account">
          <Pencil size={14} />
        </IconButton>
        {ads.status === "active" && (
          <IconButton
            onClick={() => callbacks.onUpdateAdsStatus(ads, "paused")}
            label="Pause ads account"
          >
            <Pause size={14} />
          </IconButton>
        )}
        {ads.status !== "blocked" && ads.status !== "closed" && (
          <IconButton
            onClick={() => callbacks.onUpdateAdsStatus(ads, "blocked")}
            label="Mark ads account blocked"
            danger
          >
            <ShieldOff size={14} />
          </IconButton>
        )}
        <IconButton onClick={() => callbacks.onDeleteAds(ads)} label="Delete ads account" danger>
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
        danger
          ? "text-ink-soft hover:bg-danger-soft hover:text-danger"
          : "text-ink-soft hover:bg-neutral-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function IconLink({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-primary-soft hover:text-primary"
    >
      {children}
    </Link>
  );
}
