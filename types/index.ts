// Core data model
//
// Hierarchy: GmailAccount → BusinessAccount (max 3) → AdsAccount (max 3, one ad each)
// Money flows: funding lands on a BusinessAccount, spend happens on an AdsAccount.
// If a BusinessAccount is closed, whatever funding wasn't spent yet becomes "lost".

export type GmailStatus = "active" | "disabled";
export type BusinessStatus = "active" | "closed";
export type AdsStatus = "active" | "paused" | "blocked" | "closed";
export type AdCreationStatus = "created" | "not_created";
export type TransactionType = "funding" | "spend" | "loss";

export interface GmailAccount {
  id: string;
  email: string;
  encryptedPassword: string;
  tiktokAccountName?: string;
  tiktokManagerName?: string;
  status: GmailStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessAccount {
  id: string;
  gmailAccountId: string;
  name: string;
  officialDomain?: string;
  amountFunded: number;
  amountLost: number;
  dateFunded: number;
  status: BusinessStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AdsAccount {
  id: string;
  businessAccountId: string;
  gmailAccountId: string;
  name: string;
  destinationUrl?: string;
  amountSpent: number;
  cpa: number;
  status: AdsStatus;
  adStatus: AdCreationStatus;
  invalidationReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: number;
  gmailAccountId: string;
  gmailEmail: string;
  businessAccountId?: string;
  businessName?: string;
  adsAccountId?: string;
  adsName?: string;
  cardId?: string;
  cardLabel?: string;
  note?: string;
  createdAt: number;
}

/** One day's spend + cost-per-result for one ads account. Source of truth for
 *  the running totals cached on AdsAccount, and for the analysis charts. */
export interface DailyEntry {
  id: string;
  adsAccountId: string;
  adsName: string;
  businessAccountId: string;
  businessName: string;
  gmailAccountId: string;
  gmailEmail: string;
  date: number;
  spend: number;
  cpa: number;
  note?: string;
  createdAt: number;
}

export type CardStatus = "active" | "inactive";

/** A funding card. Not every business account is funded through a tracked
 *  card — a card can also sit unlinked until it's assigned to one. */
export interface Card {
  id: string;
  name: string;
  lastFourDigits: string;
  businessAccountId?: string;
  businessName?: string;
  status: CardStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinancialSummary {
  totalFunded: number;
  totalSpent: number;
  totalLost: number;
  remainingBalance: number;
}

// Full in-memory tree used to render the dashboard
export interface AdsAccountNode extends AdsAccount {}
export interface BusinessAccountNode extends BusinessAccount {
  adsAccounts: AdsAccountNode[];
}
export interface GmailAccountNode extends GmailAccount {
  businessAccounts: BusinessAccountNode[];
}
