import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  orderBy, query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { MAX_ADS_PER_BUSINESS, MAX_BUSINESS_PER_GMAIL } from "@/lib/utils";
import type { AdCreationStatus, AdsAccount, AdsStatus, BusinessAccount, Card, CardStatus, DailyEntry, GmailAccount, GmailStatus, Transaction } from "@/types";

const gmailCol = collection(db, "gmailAccounts");
const businessCol = collection(db, "businessAccounts");
const adsCol = collection(db, "adsAccounts");
const txCol = collection(db, "transactions");
const entriesCol = collection(db, "dailyEntries");
const cardsCol = collection(db, "cards");

type Scope = { uid: string; workspaceId: string };

/** Resolve the signed-in user's workspace immediately before every query/write.
 * This deliberately avoids trusting workspace data stored in local state. */
async function currentScope(): Promise<Scope> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again to continue.");
  const profile = await getDoc(doc(db, "users", user.uid));
  const data = profile.data();
  if (!profile.exists() || data?.active !== true || !data.workspaceId) {
    throw new Error("Your workspace is not ready. Ask an administrator to activate your account.");
  }
  return { uid: user.uid, workspaceId: data.workspaceId as string };
}

function scoped(ref: ReturnType<typeof collection>, workspaceId: string) {
  return query(ref, where("workspaceId", "==", workspaceId));
}

function subscribeWorkspaceRows<T>(ref: ReturnType<typeof collection>, cb: (rows: T[]) => void) {
  let unsubscribe: () => void = () => {};
  let cancelled = false;
  void currentScope().then(({ workspaceId }) => {
    if (cancelled) return;
    unsubscribe = onSnapshot(scoped(ref, workspaceId), (snap) => cb(snap.docs.map((item) => ({ id: item.id, ...item.data() } as T))));
  }).catch(() => cb([]));
  return () => { cancelled = true; unsubscribe(); };
}

export function subscribeGmailAccounts(cb: (rows: GmailAccount[]) => void) { return subscribeWorkspaceRows<GmailAccount>(gmailCol, cb); }
export function subscribeBusinessAccounts(cb: (rows: BusinessAccount[]) => void) { return subscribeWorkspaceRows<BusinessAccount>(businessCol, cb); }
export function subscribeAdsAccounts(cb: (rows: AdsAccount[]) => void) { return subscribeWorkspaceRows<AdsAccount>(adsCol, cb); }
export function subscribeCards(cb: (rows: Card[]) => void) { return subscribeWorkspaceRows<Card>(cardsCol, cb); }

export async function createGmailAccount(data: { email: string; encryptedPassword: string; tiktokAccountName?: string; tiktokManagerName?: string; notes?: string; createdAt?: number }) {
  const scope = await currentScope(); const now = Date.now();
  return addDoc(gmailCol, { ...data, workspaceId: scope.workspaceId, ownerId: scope.uid, status: "active" as GmailStatus, createdAt: data.createdAt ?? now, updatedAt: now });
}

export async function updateGmailAccount(id: string, data: Partial<Pick<GmailAccount, "email" | "encryptedPassword" | "tiktokAccountName" | "tiktokManagerName" | "notes" | "status" | "createdAt">>) {
  await updateDoc(doc(gmailCol, id), { ...data, updatedAt: Date.now() });
}

export async function deleteGmailAccount(id: string) {
  const { workspaceId } = await currentScope(); const batch = writeBatch(db);
  const businesses = await getDocs(query(businessCol, where("workspaceId", "==", workspaceId), where("gmailAccountId", "==", id)));
  for (const business of businesses.docs) {
    const ads = await getDocs(query(adsCol, where("workspaceId", "==", workspaceId), where("businessAccountId", "==", business.id)));
    for (const ad of ads.docs) {
      const entries = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", ad.id)));
      entries.docs.forEach((entry) => batch.delete(entry.ref)); batch.delete(ad.ref);
    }
    batch.delete(business.ref);
  }
  const transactions = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("gmailAccountId", "==", id)));
  transactions.docs.forEach((transaction) => batch.delete(transaction.ref)); batch.delete(doc(gmailCol, id)); await batch.commit();
}

export async function createBusinessAccount(gmailAccountId: string, gmailEmail: string, data: { name: string; officialDomain?: string; initialFunding?: number; createdAt?: number }) {
  const scope = await currentScope();
  const existing = await getDocs(query(businessCol, where("workspaceId", "==", scope.workspaceId), where("gmailAccountId", "==", gmailAccountId)));
  if (existing.size >= MAX_BUSINESS_PER_GMAIL) throw new Error(`This Gmail already has ${MAX_BUSINESS_PER_GMAIL} business accounts.`);
  const now = Date.now(); const funding = data.initialFunding ?? 0; const ref = doc(businessCol); const batch = writeBatch(db);
  batch.set(ref, { workspaceId: scope.workspaceId, ownerId: scope.uid, gmailAccountId, name: data.name, officialDomain: data.officialDomain ?? "", amountFunded: funding, amountLost: 0, totalCharges: 0, dateFunded: now, status: "active", createdAt: data.createdAt ?? now, updatedAt: now });
  if (funding > 0) batch.set(doc(txCol), { workspaceId: scope.workspaceId, ownerId: scope.uid, type: "funding", amount: funding, date: now, gmailAccountId, gmailEmail, businessAccountId: ref.id, businessName: data.name, note: "Initial funding", createdAt: now });
  await batch.commit(); return ref;
}

export async function updateBusinessAccount(id: string, data: Partial<Pick<BusinessAccount, "name" | "officialDomain" | "createdAt" | "totalCharges">>) { await updateDoc(doc(businessCol, id), { ...data, updatedAt: Date.now() }); }

export async function addFundingToBusinessAccount(business: Pick<BusinessAccount, "id" | "amountFunded" | "totalCharges" | "gmailAccountId" | "name">, gmailEmail: string, amount: number, note?: string, card?: Pick<Card, "id" | "name" | "lastFourDigits">, charge?: number) {
  if (amount <= 0) throw new Error("Funding amount must be greater than zero.");
  const scope = await currentScope(); const now = Date.now(); const batch = writeBatch(db);
  batch.update(doc(businessCol, business.id), { amountFunded: business.amountFunded + amount, totalCharges: (business.totalCharges || 0) + (charge ?? 0), updatedAt: now });
  batch.set(doc(txCol), { workspaceId: scope.workspaceId, ownerId: scope.uid, type: "funding", amount, charge: charge ?? 0, date: now, gmailAccountId: business.gmailAccountId, gmailEmail, businessAccountId: business.id, businessName: business.name, cardId: card?.id ?? "", cardLabel: card ? `${card.name} •••• ${card.lastFourDigits}` : "", note: note ?? "", createdAt: now }); await batch.commit();
}

export async function closeBusinessAccount(business: Pick<BusinessAccount, "id" | "amountFunded" | "gmailAccountId" | "name">, gmailEmail: string) {
  const scope = await currentScope(); const adsSnap = await getDocs(query(adsCol, where("workspaceId", "==", scope.workspaceId), where("businessAccountId", "==", business.id)));
  const totalSpent = adsSnap.docs.reduce((sum, row) => sum + (row.data().amountSpent ?? 0), 0); const lost = Math.max(0, business.amountFunded - totalSpent); const now = Date.now(); const batch = writeBatch(db);
  batch.update(doc(businessCol, business.id), { status: "closed", amountLost: lost, updatedAt: now }); adsSnap.docs.forEach((ad) => { if (ad.data().status !== "closed") batch.update(ad.ref, { status: "closed", updatedAt: now }); });
  if (lost > 0) batch.set(doc(txCol), { workspaceId: scope.workspaceId, ownerId: scope.uid, type: "loss", amount: lost, date: now, gmailAccountId: business.gmailAccountId, gmailEmail, businessAccountId: business.id, businessName: business.name, note: "Business account closed — unspent funding locked", createdAt: now }); await batch.commit();
}

export async function deleteBusinessAccount(id: string) {
  const { workspaceId } = await currentScope(); const batch = writeBatch(db); const ads = await getDocs(query(adsCol, where("workspaceId", "==", workspaceId), where("businessAccountId", "==", id)));
  for (const ad of ads.docs) { const entries = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", ad.id))); entries.docs.forEach((entry) => batch.delete(entry.ref)); batch.delete(ad.ref); }
  const transactions = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("businessAccountId", "==", id))); transactions.docs.forEach((transaction) => batch.delete(transaction.ref)); batch.delete(doc(businessCol, id)); await batch.commit();
}

export async function createAdsAccount(businessAccountId: string, gmailAccountId: string, data: { name: string; destinationUrl?: string; createdAt?: number }) {
  const scope = await currentScope(); const existing = await getDocs(query(adsCol, where("workspaceId", "==", scope.workspaceId), where("businessAccountId", "==", businessAccountId)));
  if (existing.size >= MAX_ADS_PER_BUSINESS) throw new Error(`This business account already has ${MAX_ADS_PER_BUSINESS} ads accounts.`);
  const now = Date.now(); return addDoc(adsCol, { workspaceId: scope.workspaceId, ownerId: scope.uid, businessAccountId, gmailAccountId, name: data.name, destinationUrl: data.destinationUrl ?? "", amountSpent: 0, cpa: 0, status: "active" as AdsStatus, adStatus: "not_created" as AdCreationStatus, createdAt: data.createdAt ?? now, updatedAt: now });
}
export async function updateAdsAccount(id: string, data: Partial<Pick<AdsAccount, "name" | "destinationUrl" | "adStatus" | "cpa" | "createdAt">>) { await updateDoc(doc(adsCol, id), { ...data, updatedAt: Date.now() }); }
export async function updateAdsAccountStatus(id: string, status: AdsStatus, invalidationReason?: string) { await updateDoc(doc(adsCol, id), { status, invalidationReason: invalidationReason ?? "", updatedAt: Date.now() }); }
export async function deleteAdsAccount(id: string) { const { workspaceId } = await currentScope(); const batch = writeBatch(db); const entries = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", id))); entries.docs.forEach((entry) => batch.delete(entry.ref)); const transactions = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", id))); transactions.docs.forEach((transaction) => batch.delete(transaction.ref)); batch.delete(doc(adsCol, id)); await batch.commit(); }

async function recomputeAdsAccountTotals(adsAccountId: string) {
  const { workspaceId } = await currentScope(); const snap = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", adsAccountId))); const rows = snap.docs.map((item) => item.data() as DailyEntry); const amountSpent = rows.reduce((sum, row) => sum + row.spend, 0); const latest = rows.reduce<DailyEntry | null>((acc, row) => (!acc || row.date >= acc.date ? row : acc), null); await updateDoc(doc(adsCol, adsAccountId), { amountSpent, cpa: latest?.cpa ?? 0, updatedAt: Date.now() });
}

export async function addDailyEntry(ads: Pick<AdsAccount, "id" | "name" | "gmailAccountId" | "businessAccountId">, business: Pick<BusinessAccount, "name">, gmailEmail: string, data: { date: number; spend: number; cpa: number; note?: string }) {
  if (data.spend < 0 || data.cpa < 0) throw new Error("Spend and CPA can't be negative.");
  const scope = await currentScope(); const now = Date.now(); const entry = doc(entriesCol); const batch = writeBatch(db);
  batch.set(entry, { workspaceId: scope.workspaceId, ownerId: scope.uid, adsAccountId: ads.id, adsName: ads.name, businessAccountId: ads.businessAccountId, businessName: business.name, gmailAccountId: ads.gmailAccountId, gmailEmail, date: data.date, spend: data.spend, cpa: data.cpa, note: data.note ?? "", createdAt: now });
  if (data.spend !== 0) batch.set(doc(txCol), { workspaceId: scope.workspaceId, ownerId: scope.uid, type: "spend", amount: data.spend, date: data.date, gmailAccountId: ads.gmailAccountId, gmailEmail, businessAccountId: ads.businessAccountId, businessName: business.name, adsAccountId: ads.id, adsName: ads.name, dailyEntryId: entry.id, note: data.note ?? "", createdAt: now });
  await batch.commit(); await recomputeAdsAccountTotals(ads.id);
}

export async function updateDailyEntry(entry: Pick<DailyEntry, "id" | "adsAccountId">, data: { date: number; spend: number; cpa: number; note?: string }) {
  if (data.spend < 0 || data.cpa < 0) throw new Error("Spend and CPA can't be negative."); const { workspaceId } = await currentScope(); const now = Date.now(); const batch = writeBatch(db); batch.update(doc(entriesCol, entry.id), { ...data, note: data.note ?? "" }); const transactions = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("dailyEntryId", "==", entry.id))); transactions.docs.forEach((transaction) => batch.update(transaction.ref, { amount: data.spend, date: data.date, note: data.note ?? "", updatedAt: now })); await batch.commit(); await recomputeAdsAccountTotals(entry.adsAccountId);
}

export async function deleteDailyEntry(entry: Pick<DailyEntry, "id" | "adsAccountId">) { const { workspaceId } = await currentScope(); const batch = writeBatch(db); batch.delete(doc(entriesCol, entry.id)); const transactions = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("dailyEntryId", "==", entry.id))); transactions.docs.forEach((transaction) => batch.delete(transaction.ref)); await batch.commit(); await recomputeAdsAccountTotals(entry.adsAccountId); }

export async function getDailyEntriesForAds(adsAccountId: string): Promise<DailyEntry[]> { const { workspaceId } = await currentScope(); const snap = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("adsAccountId", "==", adsAccountId), orderBy("date", "desc"))); return snap.docs.map((item) => ({ id: item.id, ...item.data() } as DailyEntry)); }
export async function getDailyEntriesInRange(startMs: number, endMs: number): Promise<DailyEntry[]> { const { workspaceId } = await currentScope(); const snap = await getDocs(query(entriesCol, where("workspaceId", "==", workspaceId), where("date", ">=", startMs), where("date", "<=", endMs), orderBy("date", "asc"))); return snap.docs.map((item) => ({ id: item.id, ...item.data() } as DailyEntry)); }
export async function getTransactionsInRange(startMs: number, endMs: number): Promise<Transaction[]> { const { workspaceId } = await currentScope(); const snap = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("date", ">=", startMs), where("date", "<=", endMs), orderBy("date", "desc"))); return snap.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction)); }
export async function isEmailWhitelisted(email: string): Promise<boolean> { const snap = await getDoc(doc(collection(db, "whitelistedUsers"), email.toLowerCase())); return snap.exists(); }

export async function createCard(data: { name: string; lastFourDigits: string; businessAccountId?: string; businessName?: string; notes?: string }) { const scope = await currentScope(); const now = Date.now(); return addDoc(cardsCol, { workspaceId: scope.workspaceId, ownerId: scope.uid, name: data.name, lastFourDigits: data.lastFourDigits, businessAccountId: data.businessAccountId ?? "", businessName: data.businessName ?? "", status: "active" as CardStatus, notes: data.notes ?? "", createdAt: now, updatedAt: now }); }
export async function updateCard(id: string, data: Partial<{ name: string; lastFourDigits: string; businessAccountId: string; businessName: string; status: CardStatus; notes: string }>) { await updateDoc(doc(cardsCol, id), { ...data, updatedAt: Date.now() }); }
export async function deleteCard(id: string) { await deleteDoc(doc(cardsCol, id)); }
export async function getCardFundingTransactions(): Promise<Transaction[]> { const { workspaceId } = await currentScope(); const snap = await getDocs(query(txCol, where("workspaceId", "==", workspaceId), where("type", "==", "funding"))); return snap.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction)).filter((transaction) => !!transaction.cardId); }
