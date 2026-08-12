import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MAX_ADS_PER_BUSINESS, MAX_BUSINESS_PER_GMAIL } from "@/lib/utils";
import type {
  AdCreationStatus,
  AdsAccount,
  AdsStatus,
  BusinessAccount,
  GmailAccount,
  GmailStatus,
  Transaction,
} from "@/types";

const gmailCol = collection(db, "gmailAccounts");
const businessCol = collection(db, "businessAccounts");
const adsCol = collection(db, "adsAccounts");
const txCol = collection(db, "transactions");

// ── Live subscriptions ──────────────────────────────────────────────

export function subscribeGmailAccounts(cb: (rows: GmailAccount[]) => void) {
  return onSnapshot(gmailCol, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GmailAccount)));
  });
}

export function subscribeBusinessAccounts(cb: (rows: BusinessAccount[]) => void) {
  return onSnapshot(businessCol, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessAccount)));
  });
}

export function subscribeAdsAccounts(cb: (rows: AdsAccount[]) => void) {
  return onSnapshot(adsCol, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdsAccount)));
  });
}

// ── Gmail accounts ──────────────────────────────────────────────────

export async function createGmailAccount(data: {
  email: string;
  encryptedPassword: string;
  tiktokAccountName?: string;
  tiktokManagerName?: string;
  notes?: string;
}) {
  const now = Date.now();
  return addDoc(gmailCol, {
    ...data,
    status: "active" as GmailStatus,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateGmailAccount(
  id: string,
  data: Partial<
    Pick<
      GmailAccount,
      "email" | "encryptedPassword" | "tiktokAccountName" | "tiktokManagerName" | "notes" | "status"
    >
  >
) {
  await updateDoc(doc(gmailCol, id), { ...data, updatedAt: Date.now() });
}

export async function deleteGmailAccount(id: string) {
  const batch = writeBatch(db);

  const businesses = await getDocs(query(businessCol, where("gmailAccountId", "==", id)));
  for (const b of businesses.docs) {
    const ads = await getDocs(query(adsCol, where("businessAccountId", "==", b.id)));
    ads.docs.forEach((a) => batch.delete(a.ref));
    batch.delete(b.ref);
  }
  batch.delete(doc(gmailCol, id));

  await batch.commit();
}

// ── Business accounts ───────────────────────────────────────────────

export async function createBusinessAccount(
  gmailAccountId: string,
  gmailEmail: string,
  data: { name: string; officialDomain?: string; initialFunding?: number }
) {
  const existing = await getDocs(query(businessCol, where("gmailAccountId", "==", gmailAccountId)));
  if (existing.size >= MAX_BUSINESS_PER_GMAIL) {
    throw new Error(`This Gmail already has ${MAX_BUSINESS_PER_GMAIL} business accounts.`);
  }

  const now = Date.now();
  const funding = data.initialFunding ?? 0;

  const ref = await addDoc(businessCol, {
    gmailAccountId,
    name: data.name,
    officialDomain: data.officialDomain ?? "",
    amountFunded: funding,
    amountLost: 0,
    dateFunded: now,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  if (funding > 0) {
    await addDoc(txCol, {
      type: "funding",
      amount: funding,
      date: now,
      gmailAccountId,
      gmailEmail,
      businessAccountId: ref.id,
      businessName: data.name,
      note: "Initial funding",
      createdAt: now,
    } satisfies Omit<Transaction, "id">);
  }

  return ref;
}

export async function updateBusinessAccount(
  id: string,
  data: Partial<Pick<BusinessAccount, "name" | "officialDomain">>
) {
  await updateDoc(doc(businessCol, id), { ...data, updatedAt: Date.now() });
}

export async function addFundingToBusinessAccount(
  business: Pick<BusinessAccount, "id" | "amountFunded" | "gmailAccountId" | "name">,
  gmailEmail: string,
  amount: number,
  note?: string
) {
  if (amount <= 0) throw new Error("Funding amount must be greater than zero.");
  const now = Date.now();

  const batch = writeBatch(db);
  batch.update(doc(businessCol, business.id), {
    amountFunded: business.amountFunded + amount,
    updatedAt: now,
  });
  batch.set(doc(txCol), {
    type: "funding",
    amount,
    date: now,
    gmailAccountId: business.gmailAccountId,
    gmailEmail,
    businessAccountId: business.id,
    businessName: business.name,
    note: note ?? "",
    createdAt: now,
  } satisfies Omit<Transaction, "id">);

  await batch.commit();
}

export async function closeBusinessAccount(
  business: Pick<BusinessAccount, "id" | "amountFunded" | "gmailAccountId" | "name">,
  gmailEmail: string
) {
  const adsSnap = await getDocs(query(adsCol, where("businessAccountId", "==", business.id)));
  const totalSpent = adsSnap.docs.reduce((sum, d) => sum + (d.data().amountSpent ?? 0), 0);
  const lost = Math.max(0, business.amountFunded - totalSpent);
  const now = Date.now();

  const batch = writeBatch(db);
  batch.update(doc(businessCol, business.id), {
    status: "closed",
    amountLost: lost,
    updatedAt: now,
  });
  adsSnap.docs.forEach((a) => {
    if (a.data().status !== "closed") {
      batch.update(a.ref, { status: "closed", updatedAt: now });
    }
  });
  if (lost > 0) {
    batch.set(doc(txCol), {
      type: "loss",
      amount: lost,
      date: now,
      gmailAccountId: business.gmailAccountId,
      gmailEmail,
      businessAccountId: business.id,
      businessName: business.name,
      note: "Business account closed — unspent funding locked",
      createdAt: now,
    } satisfies Omit<Transaction, "id">);
  }

  await batch.commit();
}

export async function deleteBusinessAccount(id: string) {
  const batch = writeBatch(db);
  const ads = await getDocs(query(adsCol, where("businessAccountId", "==", id)));
  ads.docs.forEach((a) => batch.delete(a.ref));
  batch.delete(doc(businessCol, id));
  await batch.commit();
}

// ── Ads accounts ────────────────────────────────────────────────────

export async function createAdsAccount(
  businessAccountId: string,
  gmailAccountId: string,
  data: { name: string; destinationUrl?: string }
) {
  const existing = await getDocs(query(adsCol, where("businessAccountId", "==", businessAccountId)));
  if (existing.size >= MAX_ADS_PER_BUSINESS) {
    throw new Error(`This business account already has ${MAX_ADS_PER_BUSINESS} ads accounts.`);
  }

  const now = Date.now();
  return addDoc(adsCol, {
    businessAccountId,
    gmailAccountId,
    name: data.name,
    destinationUrl: data.destinationUrl ?? "",
    amountSpent: 0,
    cpa: 0,
    status: "active" as AdsStatus,
    adStatus: "not_created" as AdCreationStatus,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAdsAccount(
  id: string,
  data: Partial<Pick<AdsAccount, "name" | "destinationUrl" | "adStatus" | "cpa">>
) {
  await updateDoc(doc(adsCol, id), { ...data, updatedAt: Date.now() });
}

export async function updateAdsAccountSpend(
  ads: Pick<AdsAccount, "id" | "amountSpent" | "gmailAccountId" | "businessAccountId" | "name">,
  business: Pick<BusinessAccount, "name">,
  gmailEmail: string,
  newAmountSpent: number
) {
  if (newAmountSpent < 0) throw new Error("Amount spent can't be negative.");
  const delta = newAmountSpent - ads.amountSpent;
  const now = Date.now();

  const batch = writeBatch(db);
  batch.update(doc(adsCol, ads.id), { amountSpent: newAmountSpent, updatedAt: now });
  if (delta !== 0) {
    batch.set(doc(txCol), {
      type: "spend",
      amount: delta,
      date: now,
      gmailAccountId: ads.gmailAccountId,
      gmailEmail,
      businessAccountId: ads.businessAccountId,
      businessName: business.name,
      adsAccountId: ads.id,
      adsName: ads.name,
      note: delta < 0 ? "Correction" : "",
      createdAt: now,
    } satisfies Omit<Transaction, "id">);
  }
  await batch.commit();
}

export async function updateAdsAccountStatus(
  id: string,
  status: AdsStatus,
  invalidationReason?: string
) {
  await updateDoc(doc(adsCol, id), {
    status,
    invalidationReason: invalidationReason ?? "",
    updatedAt: Date.now(),
  });
}

export async function deleteAdsAccount(id: string) {
  await deleteDoc(doc(adsCol, id));
}

// ── Reporting ────────────────────────────────────────────────────────

export async function getTransactionsInRange(startMs: number, endMs: number): Promise<Transaction[]> {
  const q = query(
    txCol,
    where("date", ">=", startMs),
    where("date", "<=", endMs),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const snap = await getDoc(doc(collection(db, "whitelistedUsers"), email.toLowerCase()));
  return snap.exists();
}
