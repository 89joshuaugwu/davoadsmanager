# DavoPay Ads Manager

Internal tool for tracking TikTok Ads Manager accounts — replaces manual paper record-keeping
of funding, spend, and losses across Gmail → Business Account → Ads Account hierarchies, with
automatic totals, day-by-day spend/CPA logging, chart-based analysis, card tracking, and
PDF-ready reports.

Built on the DavoPay visual identity, but this is a separate internal tool — not the official
DavoPay site.

## Hierarchy

```
Gmail Account (1 TikTok account / manager account)
  └─ Business Account   (max 3 per Gmail)   — funding lives here
       └─ Ads Account   (max 3 per Business) — one ad each
            └─ Daily entries — one per day: that day's spend + cost-per-result
```

Money flow: funding lands on a **Business Account** (optionally tagged with which **Card**
paid for it). Spend is logged per day on an **Ads Account** — the running total and current
CPA shown everywhere else are recomputed from that day-by-day history, not entered directly.
When a Business Account is closed, whatever funding hasn't been spent yet is recorded as
**lost**. Every dashboard total (`Total Funded − Total Spent − Total Lost = Remaining Balance`)
is a live rollup — nothing is hand-entered as a total.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4 (CSS-first — see `app/globals.css`, no `tailwind.config.ts`) |
| Auth + DB | Firebase Auth (Google + email/password) + Firestore |
| Password vault | AES-256 via `crypto-js`, key stays server-only, decrypt only via `/api/vault` |
| Docs/reports | Cloudinary (unsigned direct upload) |
| Hosting | Vercel |

## Setup

### 1. Create the Firebase project
[Firebase Console](https://console.firebase.google.com) → new project → **Build → Authentication**
→ enable **Google** and **Email/Password** sign-in providers → **Build → Firestore Database**
→ create in production mode (any region close to you).

Then **Project settings → General → Your apps → Web app** to get the six
`NEXT_PUBLIC_FIREBASE_*` values for `.env.local`.

### 2. Publish the Firestore rules
`firestore.rules` in this repo is the actual security boundary — it's what stops anyone
but a whitelisted, signed-in user from reading or writing any account data. Copy its contents
into **Firestore Database → Rules** in the console and hit **Publish**.

**This has to be done by hand in the console every time you change `firestore.rules`** — it
isn't picked up automatically by a deploy.

### 3. Create the composite index
The per-account daily entry history (used on the ads account's own history and the analysis
charts) needs one composite index: **Firestore Database → Indexes → Add index** →
collection `dailyEntries` → fields `adsAccountId` (Ascending), `date` (Descending) → Create.

`firestore.indexes.json` has this same definition if you use the Firebase CLI
(`firebase deploy --only firestore:indexes`) instead. If you skip this step, the app still
works — Firestore just throws a one-time error in the browser console with a direct link
that creates the index for you.

### 4. Generate the Admin SDK key
**Project settings → Service accounts → Generate new private key** downloads a JSON file.
From it, fill in `.env.local`:
- `FIREBASE_ADMIN_PROJECT_ID` → `project_id`
- `FIREBASE_ADMIN_CLIENT_EMAIL` → `client_email`
- `FIREBASE_ADMIN_PRIVATE_KEY` → `private_key` (keep the `\n` escapes exactly as they appear)

This key is what lets `/api/vault` verify who's asking before it will decrypt a password —
never commit the JSON file itself.

### 5. Whitelist your email
In Firestore, create collection `whitelistedUsers` → add a document whose **ID is your email,
lowercase** (e.g. `joshuaugwu89@gmail.com`), any single field on it (e.g. `addedAt: true`) is
enough. No one — including you — can sign in without a matching document here. There's no
in-app screen for this by design (matches "no public registration"); add teammates the same way.

To add an email/password user (as opposed to Google sign-in), create them under
**Authentication → Users → Add user** first, then whitelist their email the same way.

### 6. Set up Cloudinary
[Cloudinary dashboard](https://cloudinary.com) → copy your **Cloud name** →
**Settings → Upload → Upload presets → Add upload preset** → set **Signing Mode: Unsigned** →
save, copy the preset name. Both go in `.env.local`.

### 7. Environment variables
```bash
cp .env.local.example .env.local
```
Fill in every value from steps 1–6. Generate `ENCRYPTION_KEY` with:
```bash
openssl rand -base64 48
```
Changing this key later makes every previously-saved password undecryptable — treat it like
any other production secret.

### 8. Install and run
```bash
npm install
npm run dev
```

### 9. Deploy
Push to GitHub, import the repo on [Vercel](https://vercel.com/new), paste in the same
`.env.local` values as project environment variables, deploy.

```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

## Security model, in plain terms

- The **UI redirect** (client-side, in `context/AuthContext.tsx`) is just a convenience —
  it sends signed-out or non-whitelisted people to `/login`.
- The **real** boundary is `firestore.rules`: every read/write to account data requires a
  signed-in user whose email has a document in `whitelistedUsers`.
- Gmail passwords are AES-256 encrypted before they ever reach Firestore. The encryption key
  never reaches the browser — encrypt/decrypt only happen inside `/api/vault`, which
  independently re-verifies the caller's Firebase ID token and whitelist status server-side
  before touching the key. Revealed passwords auto re-mask after 20 seconds.

## Things worth knowing

- **CPA threshold, max accounts, currency** are constants at the top of `lib/utils.ts`
  (`CPA_THRESHOLD`, `MAX_BUSINESS_PER_GMAIL`, `MAX_ADS_PER_BUSINESS`, `CURRENCY`) — change
  them there rather than hunting through components.
- **An ads account's spend and CPA are derived, not stored directly.** "Log spend" writes one
  `dailyEntries` row (that day's spend + CPA); `amountSpent` and `cpa` on the ads account are
  then recomputed from the full entry history every time. If you ever need to bulk-correct
  history, edit/delete the daily entries rather than the ads account fields directly — editing
  the account fields would just get overwritten on the next log.
- **`crypto-js` is in maintenance mode** (no active development, per its own npm deprecation
  notice) — it still works fine for this, but if you ever want to swap the AES implementation,
  `lib/crypto.ts` is the only file that touches it.
- **Print / Export PDF** (on Reports and both Analysis pages) uses the browser's native print
  dialog (`window.print()`) with dedicated `@media print` styles in `globals.css` — "Save as
  PDF" in the print dialog is the export. No PDF library involved.
- Closing a Business Account is one-way in the UI (matches "closed means closed" for a real ad
  account) — if you close one by mistake, delete and recreate it; the totals recalculate either
  way since everything's a live rollup.
- **Card view vs Tree view** on the dashboard show the same live data, just laid out
  differently — Tree is the full management view, Cards is a scannable overview.
- **Desktop gets a sidebar, mobile gets a top bar + bottom tabs** — both live in
  `components/AppShell.tsx`, which every authenticated page wraps itself in.
- **The barchart icon** next to a Gmail, business, or ads account in the Tree view jumps to
  Ads Analysis pre-filtered to just that account — no need to reselect the checkboxes.
- **Cards are optional bookkeeping, not required.** You can fund a business account with no
  card attached ("No card / other method") — the card selector on Add Funding only lists cards
  already linked to that specific business account, so link a card first (Card Management page)
  if you want it selectable there.

## Card Management

A card has a name, last 4 digits, and an optional link to one Business Account. Linking is
what makes it selectable when you Add Funding to that business account — every funding entry
that picks a card rolls up into that card's "Total funded through this card" figure on the
Cards page. A card can also sit unlinked (tracked, but not tied to a business account yet), and
relinking it later doesn't change any past funding records.

## Project structure

```
app/
  login/              Sign-in only, no sign-up
  dashboard/          Main hub — live totals, tree/card toggle
  reports/            Date-filtered ledger + print export
  analysis/business/  Funding trends + charts, multi-select filters
  analysis/ads/       Spend/CPA trends + charts, multi-select filters, deep-linkable via URL params
  cards/              Card management — link/unlink to business accounts, per-card totals
  api/vault/          Server-only encrypt/decrypt endpoint
components/
  AppShell.tsx        Sidebar (desktop) / top bar + bottom tabs (mobile) — wraps every page
  AccountTree.tsx      Tree view, incl. "view analysis" deep-links
  AccountCards.tsx     Card-grid view (same data as Tree, different layout)
  AccountModal.tsx     Add/edit for every account level + daily entry logging + funding (with card)
  CardModal.tsx        Add/edit for cards
  MultiSelectFilter.tsx Reusable checkbox filter used on both analysis pages
context/AuthContext   Client-side auth + whitelist gate
lib/
  firebase.ts         Client SDK init
  firebaseAdmin.ts     Admin SDK init (lazy — see comments)
  crypto.ts           AES-256 helpers (server-only)
  firestore-helpers.ts All Firestore reads/writes/subscriptions live here
  utils.ts            Constants, formatters, tree-builder, summary rollup, chart aggregation
types/index.ts        Shared data model
firestore.rules       The actual security boundary — publish manually, see Setup #2
firestore.indexes.json Composite index for dailyEntries — see Setup #3
```

### Firestore collections
`gmailAccounts`, `businessAccounts`, `adsAccounts`, `dailyEntries`, `transactions` (the ledger
behind Reports and Business Analysis — funding/spend/loss events), `cards`, `whitelistedUsers`.

## Latest additions

- **Yesterday** is now a date-range preset alongside Today/This Week/This Month/Custom, on
  Reports and both Analysis pages.
- Both Analysis pages now show a **data table** under the charts (not just visuals) — "Business
  Centers" + "Funding Entries" on Business Analysis, "Ads Accounts" on Ads Analysis. The account
  snapshot tables (Business Centers, Ads Accounts) always render regardless of the date range,
  since they show current state, not date-ranged activity; the ledger tables (Funding Entries)
  follow the same date range as the charts.
- **Charges** — funding can now optionally carry a fee/charge separate from the funded amount
  (e.g. a card processing fee). It rolls up into `BusinessAccount.totalCharges` and the global
  `Total Charges` stat, and shows as its own column on the Funding Entries and Business Centers
  tables.
- **Cards** got a visual redesign — dark, card-shaped tiles (masked digits, linked business
  account or "Not linked — funds any account", total funded, and a top-up count) instead of the
  original plain white cards.
