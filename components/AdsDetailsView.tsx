import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, Layers } from "lucide-react";
import type { AdsAccount } from "@/types";
import { CPA_THRESHOLD, formatCurrency, cn } from "@/lib/utils";

export function AdsDetailsView({ adsAccounts }: { adsAccounts: AdsAccount[] }) {
  const activeAds = adsAccounts.filter((a) => a.status === "active");
  const suspendedAds = adsAccounts.filter((a) => a.status !== "active");
  const goodAds = activeAds.filter((a) => a.cpa <= CPA_THRESHOLD);
  const badAds = activeAds.filter((a) => a.cpa > CPA_THRESHOLD);

  const CARDS = [
    { label: "Total Advert Accounts", value: adsAccounts.length, icon: Layers, tint: "bg-navy-soft/10 text-navy" },
    { label: "Total Suspended", value: suspendedAds.length, icon: PauseCircle, tint: "bg-ink/10 text-ink" },
    { label: "Total Active", value: activeAds.length, icon: PlayCircle, tint: "bg-primary-soft text-primary" },
    { label: "Good Accounts", value: goodAds.length, icon: CheckCircle2, tint: "bg-success-soft text-success" },
    { label: "Bad Accounts", value: badAds.length, icon: AlertTriangle, tint: "bg-danger-soft text-danger" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-2xl border border-line bg-white p-4 lg:p-5"
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.tint}`}>
                  <Icon size={16} />
                </div>
                <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-ink-soft xl:text-xs">
                  {card.label}
                </p>
              </div>
              <p className="mt-2.5 truncate font-display text-2xl font-bold text-ink">
                {card.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-ink">Ads Accounts Monitor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-soft text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Account Name</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Spend</th>
                <th className="px-5 py-3 font-medium">CPR</th>
                <th className="px-5 py-3 font-medium">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {adsAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">No ads accounts found.</td>
                </tr>
              ) : (
                adsAccounts.map((a) => {
                  const isBad = a.status === "active" && a.cpa > CPA_THRESHOLD;
                  return (
                    <tr key={a.id} className={cn("transition hover:bg-neutral-soft/50", isBad && "bg-danger-soft/10")}>
                      <td className="px-5 py-3 font-medium text-ink">{a.name}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          a.status === "active" ? "bg-success-soft text-success" : "bg-ink/10 text-ink-soft"
                        )}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">{formatCurrency(a.amountSpent)}</td>
                      <td className={cn("px-5 py-3 font-medium", isBad ? "text-danger" : "text-ink")}>
                        {formatCurrency(a.cpa)}
                      </td>
                      <td className="px-5 py-3">
                        {a.status !== "active" ? (
                          <span className="text-ink-soft">—</span>
                        ) : isBad ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <AlertTriangle size={12} /> Needs attention
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <CheckCircle2 size={12} /> Good
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
