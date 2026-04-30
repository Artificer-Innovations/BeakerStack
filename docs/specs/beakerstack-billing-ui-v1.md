---
name: BeakerStack Billing UI v1
overview: Polish the existing developer-demo billing surface into production-quality, B2C-flavored billing pages that match the existing visual language of the BeakerStack template. Adds /billing route family with Overview, Usage, Plans, and Invoices sub-pages. Extends the data model for monthly/annual cadence and invoice history. Stays scoped to a single route family without a global settings shell.
todos:
  - id: routes-and-tabs
    content: Add /billing route family with BillingTabs sub-navigation, BillingProvider wrapping the route group, and avatar menu integration
    status: pending
  - id: db-additions
    content: Add stripe_price_id_monthly/annual to billing_plans, create billing_invoices table with RLS, extend webhook handler for invoice events
    status: pending
  - id: invoice-page
    content: Build BillingInvoicesPage with paginated table, status badges, and links to Stripe-hosted invoice/PDF URLs
    status: pending
  - id: overview-page
    content: Build BillingOverviewPage with current plan card, payment status banner, quick stats, and primary CTAs
    status: pending
  - id: usage-page
    content: Build BillingUsagePage with all meters, feature caps, and reset-date semantics rendered clearly
    status: pending
  - id: plans-page
    content: Build BillingPlansPage with monthly/annual toggle, three-up plan cards, current-plan affordance, constraint warnings on downgrade
    status: pending
  - id: state-matrix
    content: Implement the nine subscription states across all four pages with appropriate banners, badges, and inline messaging
    status: pending
  - id: components
    content: Add new shared components (PlanCard, PlanFeatureList, ConstraintWarning, InvoiceTable, BillingTabs) at the right boundary (packages/billing vs apps/web)
    status: pending
isProject: false
---

# BeakerStack Billing UI v1

This spec polishes the existing developer-demo billing surface (`/billing-demo`) into production-quality billing pages that match the BeakerStack template's existing visual language. It adds a `/billing` route family with four sub-pages, extends the data model for monthly/annual subscription cadence and invoice history, and integrates with the existing avatar menu. It deliberately does NOT introduce a settings shell — billing is a sibling route to `/profile`, following the same page-shell pattern that already works.

## 1. Visual conventions

**Match the existing template, do not invent a new design language.** Before implementing, the agent must inspect the current visual treatment in:

- `apps/web/src/pages/ProfilePage.tsx` and the `ProfileHeader.web`, `ProfileStats.web`, `ProfileEditor.web` components — for card style, spacing, section headers, form treatment.
- `packages/shared/src/components/navigation/AppHeader.web.tsx` — for header height, logo placement, dropdown style.
- `packages/shared/src/components/navigation/UserMenu.web.tsx` — for menu item style, divider treatment.
- Any existing `Button`, `Input`, and `Card` primitives in `packages/shared` — reuse, do not rebuild.

The current language reads as: white surfaces on `bg-gray-50` page background, rounded cards with subtle borders (`rounded-xl border border-gray-200 bg-white`), indigo/blue primary accent (matching the existing Sign In button), neutral gray text scale, system font stack, Lucide icons. Card padding is generous (`p-6` to `p-8`). Section headings are bold and clearly separated from body. Cards stack vertically with consistent vertical rhythm (`space-y-6` between cards).

Billing pages MUST use the same patterns. New components added by this spec inherit these conventions; if a Tailwind class pattern shows up three times across existing components, treat it as the convention and reuse it.

**Centered container width:** the existing pattern uses `max-w-[800px]` for profile. Billing pages with denser content (Plans three-up grid, Invoices table) may use `max-w-[1024px]` for those specific pages. Overview and Usage stay at `max-w-[800px]` to match Profile's feel.

**Typography:**

- Page title: `text-2xl font-bold` (matches existing pages)
- Section/card title: `text-lg font-semibold`
- Body: default (`text-base text-gray-900`)
- Secondary text: `text-sm text-gray-600`
- Tertiary/meta: `text-xs text-gray-500`

**Color semantic mapping** (use Tailwind classes consistently):

- Primary action: `bg-indigo-600 hover:bg-indigo-700 text-white` (matches existing Sign In)
- Destructive action: `bg-red-600 hover:bg-red-700 text-white`
- Success state: `bg-green-50 border-green-200 text-green-900`
- Warning state: `bg-amber-50 border-amber-200 text-amber-900`
- Error state: `bg-red-50 border-red-200 text-red-900`
- Info state: `bg-blue-50 border-blue-200 text-blue-900`

## 2. Routes and navigation

### Route inventory

| Route               | Page                  | Purpose                                                                |
| ------------------- | --------------------- | ---------------------------------------------------------------------- |
| `/billing`          | `BillingOverviewPage` | Current plan, payment status, quick stats, primary CTAs                |
| `/billing/usage`    | `BillingUsagePage`    | Detailed meters and feature caps with reset semantics                  |
| `/billing/plans`    | `BillingPlansPage`    | Update plan, monthly/annual toggle, downgrade with constraint warnings |
| `/billing/invoices` | `BillingInvoicesPage` | Paginated invoice history with links to Stripe-hosted invoice/PDF URLs |

All four routes are protected via `ProtectedRoute.web`. All four are wrapped in a single `<BillingProvider>` at the route-group level in `App.tsx` so the provider hydrates once and the four pages share state. The provider is added in `App.tsx` like:

```tsx
<Route element={<ProtectedRoute.web />}>
  <Route
    element={
      <BillingProvider>
        <Outlet />
      </BillingProvider>
    }
  >
    <Route path='/billing' element={<BillingOverviewPage />} />
    <Route path='/billing/usage' element={<BillingUsagePage />} />
    <Route path='/billing/plans' element={<BillingPlansPage />} />
    <Route path='/billing/invoices' element={<BillingInvoicesPage />} />
  </Route>
</Route>
```

The legacy `/billing-demo` route stays in place during migration and is removed once `/billing` ships. The "Billing demo" link on the dashboard is replaced with a "Manage billing" link to `/billing`.

### Sub-navigation: BillingTabs

Every `/billing/*` page renders a shared `<BillingTabs>` component immediately below the page title and above the page body. It contains four tabs: **Overview**, **Usage**, **Plans**, **Invoices**. The active tab is highlighted using the existing accent color. Tabs are React Router `<NavLink>` elements so the active state is driven by the URL.

Tab bar visual treatment: horizontal row, underlined active tab in indigo, inactive tabs in `text-gray-600`. Spacing: `border-b border-gray-200` along the bottom, tabs have `px-4 py-3`. Mobile (< 640px): tabs become horizontally scrollable with no wrap.

```
┌─────────────────────────────────────────────────────┐
│ Billing                                             │
│                                                     │
│ Overview · Usage · Plans · Invoices                 │
│ ───────                                             │
│                                                     │
│ [page content]                                      │
└─────────────────────────────────────────────────────┘
```

### Avatar menu integration

Update `UserMenu.web.tsx` and `UserMenu.native.tsx` to insert a **Billing** item. Final menu order:

```
test@local.dev (header)
─────────
Profile
Billing      ← new
Dashboard
─────────
Sign Out
```

Billing icon: Lucide `CreditCard`. Profile keeps its existing icon. Dashboard keeps its existing icon. The Billing item links to `/billing` (Overview).

## 3. Page specifications

### 3.1 BillingOverviewPage (`/billing`)

**Purpose:** glanceable summary. The user lands here from the avatar menu and sees their current state in one screen without scrolling. Decisions to take action (change plan, fix payment, view invoices) are one click away.

**Layout (top to bottom):**

1. Page header: "Billing" title, BillingTabs.
2. **Status banner** (conditional, see state matrix below). Examples: "Your payment failed on Apr 23. Update your card to keep your subscription active." with a "Update payment method" link to Stripe portal. Uses `Banner` component (new, see §5).
3. **Current plan card.** Large card with:
   - Plan name (`text-2xl font-bold`): "Pro"
   - Price + cadence: "$19/month" or "$190/year"
   - Status pill: "Active" / "Cancelling Apr 25" / "Trial ends in 3 days"
   - Renewal text: "Renews on May 25, 2026" or "Ends on May 25, 2026"
   - Two primary buttons: "Change plan" (→ `/billing/plans`), "Manage payment & invoices" (→ Stripe portal, opens new tab)
4. **Quick stats grid** (3 columns on desktop, stacked on mobile). Each stat is a small card with label and value:
   - "This month's usage": "127 of 500 AI summaries"
   - "Collections": "4 of unlimited"
   - "Member since": "April 2026"
5. **Recent activity card** (optional v1, recommended): list of 3 most recent invoices with date, amount, status badge, and "View all invoices →" link to `/billing/invoices`. If no invoices yet, this card is omitted entirely (don't render an empty card).

**Free tier variation:** instead of the current plan card showing price and renewal, it shows "You're on the Free plan" with a prominent "Upgrade to Pro" CTA. Quick stats grid still renders. Recent activity card is omitted.

**Mobile:** stats grid collapses to single column. Buttons in current plan card stack vertically.

**Component composition:**

- `<Banner>` — new, app-level (`apps/web/src/components/billing/Banner.web.tsx`)
- `<CurrentPlanCard>` — new, app-level
- `<StatCard>` — new, generic enough to live in `packages/shared` if a similar primitive exists; otherwise app-level
- `<InvoiceList>` — new, used in compact mode here and full mode in `/billing/invoices`. App-level.

### 3.2 BillingUsagePage (`/billing/usage`)

**Purpose:** the reference page for "what am I using and what are my limits." Less about decisions, more about awareness. This is the page a user lands on when they think "am I about to hit my limit?"

**Layout (top to bottom):**

1. Page header + BillingTabs.
2. **Reset period card** (small info card at top): "Your usage resets on May 25, 2026 (your next billing date)." For free users: "Your usage resets on May 1, 2026 (start of next calendar month)."
3. **Metered usage section.** Heading: "Usage". For each meter (v1 has one: AI summarize), render a `<UsageRow>`:
   - Meter name and description
   - Progress bar (use existing `<UsageIndicator>` from `packages/billing`, in its expanded variant)
   - "127 of 500 used · resets May 25" text below
   - For unlimited tiers: "127 used this period · unlimited"
4. **Feature limits section.** Heading: "Limits". For each numeric feature cap (collections, items per collection), render a row:
   - Feature name
   - Current usage / cap (e.g. "4 collections of unlimited", "Items per collection: 25 max")
   - For caps that are at risk (>80% used), show in amber; at limit, in red.
5. **Plan features section.** Heading: "Plan features". For each boolean feature in the user's plan, render a row with feature name and a check (✓) or X icon plus "Available" / "Not available on your plan". The "Not available" rows include a small "Upgrade to unlock" link to `/billing/plans`.

**Empty/free state:** all sections still render but show free-tier limits. There's no "this page is empty" variant.

**Component composition:**

- `<UsageIndicator>` — exists in `packages/billing`. May need an "expanded" variant prop that includes label and reset text.
- `<FeatureLimitRow>` — new, app-level
- `<PlanFeatureRow>` — new, app-level

### 3.3 BillingPlansPage (`/billing/plans`)

**Purpose:** the decision surface. User compares plans and changes tier. This page must work both for upgrades and downgrades, must clearly mark current plan, and must warn before a downgrade that would violate current usage.

**Layout (top to bottom):**

1. Page header + BillingTabs.
2. **Title row:** "Choose a plan" (h2) with subtitle "Switch plans or update your billing cadence anytime."
3. **Monthly/Annual toggle** (centered, prominent). Pill toggle with "Monthly" and "Annually · Save 17%" labels. State persists in URL query param (`?cadence=annual`) so the toggle is shareable and survives refresh.
4. **Three-up plan grid:** Free, Pro, Max as `<PlanCard>` components. Each card contains:
   - Tier name (`text-xl font-semibold`)
   - One-line description ("For getting started", "For active users", "For power users")
   - Price block: large price number, cadence below ("/month" or "/year, billed annually")
   - Primary action button (state varies, see below)
   - Optional constraint warning card (see below)
   - "What's included" feature list with check/X icons
5. Below grid: small text — "All plans billed in USD. Taxes calculated at checkout where applicable. Cancel anytime."

**PlanCard button states (for each card, given current user state):**

| User's current plan | Card represents | Button text                                                        | Action                    |
| ------------------- | --------------- | ------------------------------------------------------------------ | ------------------------- |
| Free                | Free            | "Current plan" (disabled)                                          | none                      |
| Free                | Pro             | "Upgrade to Pro" (primary)                                         | initiate Stripe checkout  |
| Free                | Max             | "Upgrade to Max" (primary)                                         | initiate Stripe checkout  |
| Pro                 | Free            | "Downgrade to Free" (secondary, opens confirm)                     | downgrade flow            |
| Pro                 | Pro             | "Current plan" (disabled) OR "Switch to annual" if cadence differs | toggle cadence via Stripe |
| Pro                 | Max             | "Upgrade to Max" (primary)                                         | Stripe upgrade            |
| Max                 | Free            | "Downgrade to Free" (secondary, opens confirm)                     | downgrade flow            |
| Max                 | Pro             | "Downgrade to Pro" (secondary, opens confirm)                      | downgrade flow            |
| Max                 | Max             | "Current plan" (disabled) OR "Switch to annual"                    | toggle cadence via Stripe |

**Constraint warning:** if the current user's usage or feature consumption would exceed the target plan's limits, the target plan card shows a `<ConstraintWarning>` card inside it (above the button). Examples:

- Downgrading Pro → Free: "You currently have 4 collections. The Free plan allows 2. You'll need to delete 2 collections before downgrading."
- Downgrading Max → Pro: "You're using Feature B, which is only available on Max. It will be disabled if you downgrade."
- Downgrading after exceeding metered cap mid-period: "You've used 127 AI summaries this month. The Free plan allows 30 per month."

When constraint warning is present, the action button is disabled with text "Resolve issues to downgrade" OR enabled with text "Downgrade anyway" depending on whether the constraint is hard (numeric cap exceeded) or soft (feature usage). For v1, all constraints are hard — button is disabled. Document this in code comments so it's easy to relax later.

**Implementation note (BeakerStack):** boolean entitlement loss is treated as a **soft** constraint (warning shown, downgrade CTA remains enabled); **collections cap, items-per-collection cap, and metered usage** against the target plan remain **hard** (CTA disabled until resolved). This supersedes the “v1 all hard” behavior for booleans only.

**Confirmation modal for downgrades:** clicking a downgrade button opens a modal with:

- Title: "Downgrade to [Plan]?"
- Body: explains what changes (feature loss, cap reduction, when change takes effect — typically end of current billing period)
- "Cancel" and "Confirm downgrade" buttons (the confirm is destructive-styled)

**Cadence toggle behavior for active subscribers:** if user is on Pro Monthly and toggles to Annual view, the Pro card shows "Switch to annual" instead of "Current plan." Clicking opens a confirmation explaining proration handled by Stripe. Implementation: call existing `initiateCheckout` with the annual price ID (Stripe handles the proration on subscription update).

**Component composition:**

- `<PlanCard>` — new, app-level
- `<PlanFeatureList>` — new, app-level (a styled list of features with check/X icons; reused from PlanCard and potentially from a future public pricing page)
- `<ConstraintWarning>` — new, app-level
- `<CadenceToggle>` — new, app-level
- `<ConfirmDowngradeModal>` — new, app-level

### 3.4 BillingInvoicesPage (`/billing/invoices`)

**Purpose:** historical record. Users come here to find an invoice for expense reporting or to verify a charge.

**Layout:**

1. Page header + BillingTabs.
2. Title: "Invoices" with subtitle "Download invoices and receipts for your records."
3. **InvoiceTable** with columns:
   - Date (formatted: "Apr 25, 2026")
   - Description (e.g. "Pro · Monthly")
   - Amount (formatted: "$19.00")
   - Status (badge: "Paid" green, "Open" blue, "Failed" red, "Refunded" gray, "Void" gray)
   - Actions ("View" → opens `hosted_invoice_url` in new tab; "PDF" → opens `invoice_pdf_url` in new tab)
4. **Pagination:** "Load more" button at the bottom; loads next 20. Avoids pagination controls for v1.
5. **Empty state:** if user has no invoices (free tier user, never paid): "No invoices yet. Your invoices will appear here after your first payment." with link to `/billing/plans` to upgrade.

**Component composition:**

- `<InvoiceTable>` — new, app-level
- `<StatusBadge>` — new, generic enough that it could live in `packages/shared` (used elsewhere too in future)

## 4. State matrix

The four pages must handle the following subscription states correctly. Each row lists what each page shows for that state.

| State                                                                                          | Overview banner                                                                                               | Plans page indicator                                                                                                               | Invoices                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Loading**                                                                                    | Skeleton card                                                                                                 | Skeleton grid                                                                                                                      | Skeleton table                          |
| **No subscription** (rare; should be auto-corrected to Free by `ensure_free_subscription` RPC) | Trigger ensure-free; render Free state                                                                        | Free shown as current                                                                                                              | Empty state                             |
| **Free**                                                                                       | Free plan card with upgrade CTA                                                                               | Free shown as current; Pro/Max have "Upgrade"                                                                                      | Empty state with upgrade CTA            |
| **Paid active**                                                                                | Plan card with renewal date                                                                                   | Current plan disabled; others have switch/up/down                                                                                  | Full table                              |
| **Paid cancelled-pending** (cancelled but billing period not yet over)                         | Amber banner: "Your subscription is cancelled and ends [date]. Reactivate?" + reactivate button               | Current plan still shows as current with "Cancelled — ends [date]" sub-label; reactivate available                                 | Full table                              |
| **Payment failed**                                                                             | Red banner: "Payment failed on [date]. Update payment method to avoid service interruption." with portal link | Same as paid active                                                                                                                | Most recent invoice shows Failed status |
| **Trial active**                                                                               | Blue banner: "Your trial ends on [date]. Add payment method to continue." with portal link                    | Current plan shown with "Trial" label                                                                                              | Empty or trial invoice                  |
| **Trial ending** (last 3 days)                                                                 | Amber banner with stronger urgency copy                                                                       | Same as trial active                                                                                                               | Empty or trial invoice                  |
| **Post-downgrade-pending** (user requested downgrade, takes effect at period end)              | Info banner: "You'll be moved to [Plan] on [date]."                                                           | Current plan shows as current with "Downgrading to [Plan] on [date]"; target plan card shows "Scheduled" instead of "Current plan" | Full table                              |

The Usage page is largely state-independent — it always shows current usage against current plan limits. The only state-dependent behavior is rendering a small banner at top during payment-failed or trial-ending states reminding the user that access may change.

## 5. New components

### Components in `packages/billing` (generic, reusable)

These are extensions to the existing module. No domain vocabulary, no tier-specific names.

| Component                     | Purpose                                                                          | Lives at                                           |
| ----------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| `<UsageIndicator>` (existing) | Add an `expanded` variant prop showing label + reset text                        | `packages/billing/src/components/UsageIndicator.*` |
| `<SubscriptionStatusBadge>`   | Pill rendering Active / Cancelling / Trial / Failed states from a `Subscription` | new in `packages/billing/src/components/`          |

### Components in `apps/web/src/components/billing/` (template-level, opinionated)

These live in the app, not the package. They're the styled, BeakerStack-flavored building blocks that forks edit directly to change look.

| Component                       | Purpose                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `BillingTabs.web.tsx`           | The four-tab sub-navigation across all `/billing/*` pages                              |
| `Banner.web.tsx`                | Status banners (info/warning/error/success variants) used at top of pages              |
| `CurrentPlanCard.web.tsx`       | The large plan card on Overview                                                        |
| `StatCard.web.tsx`              | The small quick-stat cards on Overview                                                 |
| `PlanCard.web.tsx`              | One of three cards in the Plans grid                                                   |
| `PlanFeatureList.web.tsx`       | Check/X feature list inside PlanCard                                                   |
| `CadenceToggle.web.tsx`         | Monthly/Annual pill toggle                                                             |
| `ConstraintWarning.web.tsx`     | The yellow callout shown inside a plan card when downgrade would violate current usage |
| `ConfirmDowngradeModal.web.tsx` | Modal opened by downgrade actions                                                      |
| `InvoiceTable.web.tsx`          | The paginated invoice table                                                            |
| `StatusBadge.web.tsx`           | Generic status pill (could be promoted to `packages/shared` if reused)                 |
| `FeatureLimitRow.web.tsx`       | One row in the Usage page's feature limits section                                     |
| `PlanFeatureRow.web.tsx`        | One row in the Usage page's plan features section                                      |

For each `.web.tsx`, ship a `.native.tsx` sibling for mobile parity. Shared logic and prop types go in a sibling `.ts` file.

**Boundary rationale:** anything that needs to look generically "billing-y" with no design opinion stays in `packages/billing`. Anything that has BeakerStack-specific styling, copy patterns, or layout opinions lives in `apps/web`. The test: a fork that wants a totally different look should be able to rewrite all of `apps/web/src/components/billing/` without touching `packages/billing`.

## 6. Data model additions

### `billing_plans` table

Add two columns:

```sql
ALTER TABLE billing_plans
  ADD COLUMN stripe_price_id_monthly text,
  ADD COLUMN stripe_price_id_annual text;
```

Migrate any existing `stripe_price_id` data into `stripe_price_id_monthly` and drop the old column once migration is verified. The existing `billing_subscriptions.stripe_price_id` (which records what the user actually subscribed to) is unchanged — that field is the source of truth for "what cadence is this user on."

**Plan selection logic:** "what plan is this user on" resolves by joining `billing_subscriptions.stripe_price_id` against either `billing_plans.stripe_price_id_monthly` or `billing_plans.stripe_price_id_annual`. The plan row is the same regardless of cadence. Cadence is derived from which column matched.

**Sync script update:** `scripts/sync-billing-stripe.mjs` (or the package equivalent) must be updated to ensure both monthly and annual Stripe Price objects exist for each paid plan and to populate both columns.

### `billing_invoices` table (new)

```sql
CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  amount_due integer NOT NULL,        -- cents
  amount_paid integer NOT NULL,        -- cents
  currency text NOT NULL,
  status text NOT NULL,                -- paid, open, void, uncollectible, draft
  description text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  paid_at timestamptz
);

CREATE INDEX idx_billing_invoices_user_id_created ON billing_invoices(user_id, created_at DESC);
CREATE INDEX idx_billing_invoices_stripe_id ON billing_invoices(stripe_invoice_id);
```

**RLS:**

- `SELECT` policy: `auth.uid() = user_id` (users see their own invoices only)
- No client `INSERT` / `UPDATE` / `DELETE` — webhook handler writes via service role only

### Webhook handler additions

Extend `supabase/functions/stripe-webhook` to handle these additional events idempotently (using the existing `billing_webhook_events` log for dedup):

- `invoice.created` → upsert `billing_invoices` row
- `invoice.finalized` → update row, set `finalized_at`, populate `hosted_invoice_url` and `invoice_pdf_url`
- `invoice.paid` → update status to `paid`, set `paid_at`, `amount_paid`
- `invoice.payment_failed` → update status, do NOT mark subscription as failed yet (Stripe handles dunning); flag for UI banner via subscription status update
- `invoice.payment_succeeded` → already handled by existing subscription update path; ensure invoice row consistent
- `invoice.voided` → update status to `void`

Each handler resolves `user_id` by looking up `stripe_customer_id` against `billing_subscriptions`. If no subscription exists yet (rare timing edge case), log to `billing_webhook_events` and let a later subscription-created event reconcile.

## 7. Non-goals (v1)

These are explicitly out of scope. Document them in code comments where the temptation to build them might arise, so future contributors know they were deliberately deferred.

- **Native payment method editing.** Always link out to Stripe customer portal for card updates. The `hosted_invoice_url` and Stripe portal handle every payment-method-adjacent flow.
- **PDF invoice generation.** We use Stripe's `invoice_pdf_url` directly. Don't generate PDFs in BeakerStack.
- **Native invoice itemization.** The invoice table shows summary; users click "View" to see Stripe-hosted line items.
- **Team / seats / per-user pricing.** Not part of v1. The data model assumes one subscription per user.
- **Proration preview.** Stripe handles proration server-side at upgrade/downgrade time. We don't compute or display previews; we trust Stripe.
- **Tax handling beyond what Stripe Tax provides.** If Stripe Tax is enabled at the account level, it's automatic. We don't render tax breakdowns in our UI.
- **Settings shell.** Profile and Billing remain sibling top-level routes. When a third or fourth settings section is added later, revisit consolidating into `/settings/*` with a shell.
- **Public pricing page.** `<PlanCard>` and `<PlanFeatureList>` are designed for reuse on a future public `/pricing` route, but that route is not built in v1. The components must accept a prop indicating "logged out" mode where button actions go to signup instead of checkout, but we do not wire the public route in this spec.
- **Coupons, promo codes, referrals.** All handled via Stripe directly if needed; no UI in v1.
- **Usage-based metered billing in Stripe.** Our metered features track usage in our DB and gate access; we do not report usage to Stripe Meters in v1.
- **Multi-currency UI.** Display amounts in the currency stored on the invoice (Stripe-controlled). We don't convert or offer currency selection.

## 8. Migration and rollout

1. Ship DB migration adding `stripe_price_id_monthly`/`annual` and `billing_invoices` table; backfill existing data.
2. Ship webhook handler updates; verify with Stripe CLI against local Edge Function.
3. Ship `packages/billing` additions (`SubscriptionStatusBadge`, `UsageIndicator` expanded variant).
4. Ship `apps/web/src/components/billing/` components.
5. Ship the four pages and routes; wire `BillingProvider` to the route group.
6. Update `UserMenu` (web + native) to add Billing item.
7. Replace dashboard's "Billing demo" link with "Manage billing" → `/billing`.
8. Verify all nine states render correctly using a combination of real Stripe test events (CLI) and `simulateUpgrade` for the demo modes that don't require Stripe traffic.
9. Remove `/billing-demo` route and component once parity is verified.
10. Mirror page structure to `apps/mobile` using existing native shell patterns; mobile parity can ship in a follow-up if web ships first.

## 9. Testing

- **Unit:** each new component gets a basic render test verifying state-dependent UI (e.g. PlanCard renders "Current plan" when user is on that plan, "Upgrade to Pro" when not).
- **Integration:** Stripe CLI scenarios documented in `apps/web/docs/billing-testing.md`:
  - `stripe trigger checkout.session.completed` → verify subscription appears, redirect handled
  - `stripe trigger customer.subscription.deleted` → verify cancellation banner appears
  - `stripe trigger invoice.payment_failed` → verify red banner appears on Overview
  - `stripe trigger customer.subscription.trial_will_end` → verify amber trial-ending banner
  - `stripe trigger invoice.paid` → verify invoice row appears
- **Manual:** walk through all nine subscription states using `simulateUpgrade` (where applicable) and Stripe CLI; verify each page renders correctly for each state.
- **Mobile:** smoke test that all four routes navigate and render core state correctly on iOS and Android once mobile parity ships.

## 10. Open questions for the agent to flag, not decide

- Does the existing `Button` primitive support the destructive variant needed for downgrade confirmation? If not, propose adding it to the existing primitive rather than creating a one-off button.
- Does `packages/shared` already have a `Modal` or `Dialog` primitive? Reuse if so; otherwise propose where the new `ConfirmDowngradeModal` should live.
- Is there an existing `Skeleton` loader pattern? Match it for the loading states; if none exists, propose a minimal one.

These are flagged so the agent surfaces them in a PR description rather than guessing.
