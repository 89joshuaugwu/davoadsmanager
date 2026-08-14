"use client";

import { ChevronDown, Mail, Plus } from "lucide-react";
import { useState } from "react";
import { PasswordReveal } from "@/components/PasswordReveal";
import { StatusBadge, HighCpaBadge, ElevatedCpaBadge } from "@/components/StatusBadge";
import type { TreeCallbacks } from "@/components/AccountTree";
import {
  MAX_ADS_PER_BUSINESS,
  MAX_BUSINESS_PER_GMAIL,
  formatCurrency,
  getCpaAlertLevel,
} from "@/lib/utils";
import type { GmailAccountNode } from "@/types";

export function AccountCards({
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
        <p className="mt-1 text-sm text-ink-soft">Switch to Tree view to add your first one.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {gmailAccounts.map((g) => (
        <GmailCard key={g.id} gmail={g} callbacks={callbacks} />
      ))}
    </div>
  );
}

function GmailCard({ gmail, callbacks }: { gmail: GmailAccountNode; callbacks: TreeCallbacks }) {
  const [expanded, setExpanded] = useState(false);
  const funded = gmail.businessAccounts.reduce((s, b) => s + b.amountFunded, 0);
  const spent = gmail.businessAccounts.reduce(
    (s, b) => s + b.adsAccounts.reduce((s2, a) => s2 + a.amountSpent, 0),
    0
  );
  const lost = gmail.businessAccounts.reduce((s, b) => s + b.amountLost, 0);
  const anyFlagged = gmail.businessAccounts.some((b) => b.adsAccounts.some((a) => getCpaAlertLevel(a) !== "normal"));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
              <Mail size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-ink">{gmail.email}</p>
              <p className="truncate text-xs text-ink-soft">
                {gmail.tiktokManagerName || gmail.tiktokAccountName || "No manager name set"}
              </p>
            </div>
          </div>
          <StatusBadge status={gmail.status} />
        </div>

        <div className="mt-3">
          <PasswordReveal encryptedPassword={gmail.encryptedPassword} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Funded" value={funded} tone="text-primary" />
          <Stat label="Spent" value={spent} tone="text-navy" />
          <Stat label="Lost" value={lost} tone="text-danger" />
        </div>

        {anyFlagged && (
          <div className="mt-3">
            <HighCpaBadge />
          </div>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-center gap-1.5 border-t border-line py-2.5 text-xs font-semibold text-ink-soft transition hover:bg-neutral-soft"
      >
        {gmail.businessAccounts.length}/{MAX_BUSINESS_PER_GMAIL} business accounts
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-line bg-canvas/60 p-3">
          {gmail.businessAccounts.map((b) => (
            <BusinessMiniCard
              key={b.id}
              business={b}
              gmailEmail={gmail.email}
              callbacks={callbacks}
            />
          ))}
          {gmail.businessAccounts.length < MAX_BUSINESS_PER_GMAIL && (
            <button
              onClick={() => callbacks.onAddBusiness(gmail.id, gmail.email)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary-soft"
            >
              <Plus size={13} /> Add Business Account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BusinessMiniCard({
  business,
  gmailEmail,
  callbacks,
}: {
  business: GmailAccountNode["businessAccounts"][number];
  gmailEmail: string;
  callbacks: TreeCallbacks;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{business.name}</p>
          <p className="text-xs text-ink-soft">
            {formatCurrency(business.amountFunded)} funded · {business.adsAccounts.length}/{MAX_ADS_PER_BUSINESS} ads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={business.status} />
          <ChevronDown size={14} className={`text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          {business.adsAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas/60 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{a.name}</p>
                <p className="text-[11px] text-ink-soft">
                  {formatCurrency(a.amountSpent)} spent · CPR {formatCurrency(a.cpa)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {getCpaAlertLevel(a) === "high" && <HighCpaBadge />}
                {getCpaAlertLevel(a) === "elevated" && <ElevatedCpaBadge />}
                <button
                  onClick={() => callbacks.onLogSpend(a, business.name, gmailEmail)}
                  className="rounded-full border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-primary hover:text-primary"
                >
                  Log spend
                </button>
              </div>
            </div>
          ))}
          {business.adsAccounts.length < MAX_ADS_PER_BUSINESS && business.status === "active" && (
            <button
              onClick={() => callbacks.onAddAds(business.id, business.gmailAccountId, business.createdAt)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-1.5 text-[11px] font-semibold text-primary transition hover:border-primary hover:bg-primary-soft"
            >
              <Plus size={12} /> Add Ads Account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-canvas px-1.5 py-2">
      <p className={`truncate font-display text-xs font-bold ${tone}`}>{formatCurrency(value)}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}
