import type {
  AdsAccount,
  AdsAccountNode,
  BusinessAccount,
  BusinessAccountNode,
  FinancialSummary,
  GmailAccount,
  GmailAccountNode,
} from "@/types";

/** Cost-per-conversion above this triggers the high-CPA visual flag. */
export const CPA_THRESHOLD = 100;

/** Hard caps from the account hierarchy. */
export const MAX_BUSINESS_PER_GMAIL = 3;
export const MAX_ADS_PER_BUSINESS = 3;

/** Display currency. Change to "USD" (and $ below) if you'd rather track in dollars. */
export const CURRENCY = "NGN";
const CURRENCY_SYMBOL = "₦";

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${CURRENCY_SYMBOL}${formatted}`;
}

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function isHighCpa(account: Pick<AdsAccount, "cpa" | "status">): boolean {
  return account.status === "active" && account.cpa > CPA_THRESHOLD;
}

/** Builds the nested Gmail → Business → Ads tree from three flat collections. */
export function buildAccountTree(
  gmailAccounts: GmailAccount[],
  businessAccounts: BusinessAccount[],
  adsAccounts: AdsAccount[]
): GmailAccountNode[] {
  return gmailAccounts
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((gmail) => {
      const businesses: BusinessAccountNode[] = businessAccounts
        .filter((b) => b.gmailAccountId === gmail.id)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((business) => {
          const ads: AdsAccountNode[] = adsAccounts
            .filter((a) => a.businessAccountId === business.id)
            .sort((a, b) => a.createdAt - b.createdAt);
          return { ...business, adsAccounts: ads };
        });
      return { ...gmail, businessAccounts: businesses };
    });
}

/** Pure rollup: Total Funded − Total Spent − Total Lost = Remaining Active Balance. */
export function computeSummary(
  businessAccounts: BusinessAccount[],
  adsAccounts: AdsAccount[]
): FinancialSummary {
  const totalFunded = businessAccounts.reduce((sum, b) => sum + b.amountFunded, 0);
  const totalSpent = adsAccounts.reduce((sum, a) => sum + a.amountSpent, 0);
  const totalLost = businessAccounts.reduce((sum, b) => sum + b.amountLost, 0);
  return {
    totalFunded,
    totalSpent,
    totalLost,
    remainingBalance: totalFunded - totalSpent - totalLost,
  };
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
