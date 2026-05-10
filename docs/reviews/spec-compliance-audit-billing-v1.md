# Spec-to-code compliance audit — billing-v1 vs `main`

**Branch reviewed:** `billing-v1`  
**Specifications:** `docs/specs/beakerstac-billing-v1.md`, `docs/specs/beakerstack-billing-ui-v1.md`  
**Methodology:** Phases 1–5 completed as requested; report written after Phase 5.  
**Constraint:** Analysis only — no code changes.

---

## Phase 1 — Spec ingestion (atomic requirements)

Each requirement is one verifiable statement. IDs are stable for traceability below.

### Core billing (`beakerstac-billing-v1.md`)

| ID      | Requirement                                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 | Stripe must remain the source of truth for subscription state; DB stays aligned via webhooks or Stripe-backed actions.                                                                                                           |
| REQ-002 | Entitlements must be derived from plan configuration + subscription (no separately stored entitlement rows).                                                                                                                     |
| REQ-003 | Schema must support multiple products without structural changes per product.                                                                                                                                                    |
| REQ-004 | Usage limits must be enforceable by the app via module-provided checks (`getRemainingUsage` / `hasExceededLimit` pattern); module must not silently block actions alone.                                                         |
| REQ-005 | Free tier must be first-class with status distinct from paid Stripe subscriptions (`free`, no Stripe subscription id where applicable).                                                                                          |
| REQ-006 | Demo shortcuts must not live inside reusable billing logic except documented guardrails; demo upgrades via gated RPCs per appendix.                                                                                              |
| REQ-007 | Tables `billing_products`, `billing_plans`, `billing_subscriptions`, `billing_usage_events`, `billing_usage_aggregates`, `billing_webhook_events` exist with intended semantics (products/plans/subscriptions/usage/events/log). |
| REQ-008 | RLS must restrict subscriptions and usage rows so users only **select** their own rows; subscription mutations via trusted paths only.                                                                                           |
| REQ-009 | API surface includes entitlement/feature access semantics equivalent to `canUserAccessFeature(userId, productId, featureName)`.                                                                                                  |
| REQ-010 | API surface includes current plan resolution equivalent to `getUserPlan(userId, productId)`.                                                                                                                                     |
| REQ-011 | API surface includes `getFeatureValue` semantics for boolean or numeric limits.                                                                                                                                                  |
| REQ-012 | API surface includes `getRemainingUsage` returning used/limit/remaining/periodEnd for an event type.                                                                                                                             |
| REQ-013 | API surface includes `hasExceededLimit`.                                                                                                                                                                                         |
| REQ-014 | API surface includes `recordUsageEvent` including optional **metadata**.                                                                                                                                                         |
| REQ-015 | API surface includes `initiateCheckout` with optional `successUrl`, `cancelUrl`, **`trialDays`**.                                                                                                                                |
| REQ-016 | API surface includes customer portal URL retrieval (`getCustomerPortalUrl`).                                                                                                                                                     |
| REQ-017 | API surface includes `downgradeToFree` (cancel paid subscription at period end).                                                                                                                                                 |
| REQ-018 | API surface includes `cancelSubscriptionImmediately`.                                                                                                                                                                            |
| REQ-019 | API surface includes `getPublicPlans` and `getPlan(planId)`.                                                                                                                                                                     |
| REQ-020 | React **PricingTable** matches documented props (`productId`, `currentUserId`, `highlightPlanId`, `onCheckout`).                                                                                                                 |
| REQ-021 | React **UpgradePrompt** matches documented props (`productId`, `reason`, `suggestedPlanId`, `onUpgrade`).                                                                                                                        |
| REQ-022 | React **UsageIndicator** documents progress/visualization and updates as usage changes (including expanded UX where specified).                                                                                                  |
| REQ-023 | React **SubscriptionStatus** exists per spec snippet.                                                                                                                                                                            |
| REQ-024 | React **CustomerPortalLink** exists per spec snippet.                                                                                                                                                                            |
| REQ-025 | React **FeatureGate** accepts product + feature identifier and fallback (`featureName` in spec snippet).                                                                                                                         |
| REQ-026 | Declarative billing config seeds DB idempotently (sync/setup script pattern).                                                                                                                                                    |
| REQ-027 | Missing subscription for a product must be corrected toward free tier (`ensure` semantics).                                                                                                                                      |
| REQ-028 | Usage periods use billing period for paid users and **calendar month** for free tier users.                                                                                                                                      |
| REQ-029 | Webhook handler processes listed lifecycle events including checkout completion, subscription updated/deleted, trial ending signal, invoice payment failed/succeeded (per spec lists).                                           |
| REQ-030 | Webhooks verify Stripe signatures; events logged in `billing_webhook_events`; processing idempotent for retries.                                                                                                                 |
| REQ-031 | Module reads Stripe keys from environment (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) per spec’s configuration section.                                                                             |

### Appendix / template alignment (`beakerstac-billing-v1.md` appendix)

| ID      | Requirement                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-032 | Template demo tier vocabulary is app-owned (Free/Pro/Max-style ids), not hardcoded inside `packages/billing`.                                        |
| REQ-033 | `/billing-demo` route demonstrates three entitlement surfaces per appendix **or** equivalent documented migration path.                              |
| REQ-034 | Demo RPCs (`simulateUpgrade`-style, usage reset) are gated server-side; client demo flags are UX-only.                                               |
| REQ-035 | Webhook testing documentation exists at **`apps/web/docs/billing-demo.md`** with Stripe CLI scenarios idempotency guidance (appendix explicit path). |

### Billing UI v1 (`beakerstack-billing-ui-v1.md`)

| ID      | Requirement                                                                                                                                                                                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-036 | `/billing`, `/billing/usage`, `/billing/plans`, `/billing/invoices` exist under **ProtectedRoute**, wrapped once by **`BillingProvider`** at route-group level as illustrated.                                                                                         |
| REQ-037 | Each `/billing/*` page renders shared **`BillingTabs`** below title with four tabs (`NavLink`).                                                                                                                                                                        |
| REQ-038 | **`UserMenu.web`** and **`UserMenu.native`** include **Billing** (`CreditCard`) linking to `/billing`, ordered Profile → Billing → Dashboard above Sign Out.                                                                                                           |
| REQ-039 | **BillingOverviewPage** matches §3.1 structure (banner(s), current plan card behavior free vs paid, quick stats, optional recent invoices when present).                                                                                                               |
| REQ-040 | **BillingUsagePage** matches §3.2 (reset-period semantics card, meter section with UsageIndicator expanded usage, limits rows, plan features rows).                                                                                                                    |
| REQ-041 | **BillingPlansPage** matches §3.3 (cadence toggle persisted in URL query; PlanCard grid; downgrade modal; constraint warnings disable downgrade when hard constraints fail).                                                                                           |
| REQ-042 | **BillingInvoicesPage** matches §3.4 (columns, Stripe-hosted links, load-more pagination **20** rows).                                                                                                                                                                 |
| REQ-043 | Nine-state matrix behaviors render consistently across Overview / Plans / Invoices where applicable (Loading, No subscription→free ensure, Free, Paid active, Cancelled-pending + **reactivate**, Payment failed, Trial active, Trial ending, Post-downgrade-pending). |
| REQ-044 | **`billing_plans`** gains **`stripe_price_id_monthly`** / **`stripe_price_id_annual`**; **`billing_subscriptions`** records **`stripe_price_id`** for cadence resolution; **`billing_invoices`** exists with webhook-only writes.                                      |
| REQ-045 | **`stripe-webhook`** handles **`invoice.created`**, **`invoice.finalized`**, **`invoice.paid`**, **`invoice.payment_failed`**, **`invoice.payment_succeeded`**, **`invoice.voided`** per §6 with idempotent upserts into **`billing_invoices`**.                       |
| REQ-046 | Invoice timing edge case per §6: if subscription lookup fails, **log** webhook row and reconcile later (must not necessarily fail entire webhook processing path).                                                                                                     |
| REQ-047 | **`UsageIndicator`** gains **`expanded`** variant with label + reset text (`packages/billing`). **`SubscriptionStatusBadge`** exists (`packages/billing`).                                                                                                             |
| REQ-048 | **`/billing-demo`** removed after parity; dashboard links **Manage billing** → `/billing`.                                                                                                                                                                             |
| REQ-049 | Mobile parity for `/billing` routes ships per rollout §8 step 10 **or** explicitly deferred with mirror scaffolding — spec presents both.                                                                                                                              |

### Ambiguities / assumptions

1. **Naming drift:** Appendix mentions RPC **`ensure_free_subscription`** while core migration defines **`ensure_billing_subscription`** — treated as same intent unless repo standardizes names elsewhere.
2. **`stripe_price_id` column evolution:** Core DDL uses singular plan price column; UI appendix replaces with monthly/annual — interpreted as additive migration superseding core DDL snapshot (not an internal contradiction if specs read chronologically).
3. **`PricingTable` vs template `/billing/plans`:** Core component library vs UI spec **PlanCard** grid — both describe pricing UX at different layers; compliance judged separately (REQ-020 vs REQ-041).

---

## Phase 2 — Code survey (inventory)

### `packages/billing`

- **Entry / exports:** `src/index.ts`, `src/web.ts`, `src/native.ts`, `src/client.ts`
- **Configuration / types:** `src/schema.ts` (`defineBillingConfig`, Zod schemas), `src/types.ts`
- **Provider:** `BillingProvider.tsx`, realtime subscription refresh on `billing_subscriptions`
- **Hooks:** `useBillingContext`, `useSubscription`, `usePlan`, `usePlanCatalog`, `useFeature`, `useUsage`, `useRecordUsage`, `useCheckout`, `useCustomerPortal`, `useBillingStripeActions`, `useInvoices`, `useBillingState`, `useBillingConfig`
- **Components:** `PricingTable.*`, `UpgradePrompt.*`, `UsageIndicator.*`, `SubscriptionStatus.*`, `SubscriptionStatusBadge.*`, `CustomerPortalLink.*`, `FeatureGate.*`, `BillingErrorBoundary.tsx`
- **Tests:** Vitest files alongside hooks/components (`*.test.tsx`), `schema.test.ts`, `entrypoints.test.ts`, etc.

### Supabase (`supabase/`)

- **Migrations:** `20250424120000_billing_v1.sql` (core tables, RLS, RPCs, realtime publication), `20260426000100_billing_demo_collections.sql`, `20260427120000_billing_ui_v1.sql` (monthly/annual prices + invoices + subscription price id)
- **Functions:** `stripe-webhook/index.ts`, `billing-stripe/index.ts`, `_shared/cors.ts`
- **Tests:** `supabase/tests/billing.test.sql`

### Apps / tooling

- **`apps/web`:** `BillingProviderLayout.tsx`, `pages/billing/*`, `components/billing/*`, `billing/beakerstackBillingConfig.ts`, docs `billing-testing.md`, deprecated stub `billing-demo.md`
- **`apps/mobile`:** `screens/BillingScreen.tsx`, `billing/beakerstackBillingConfig.ts`; DB migrations are only at repo root `supabase/migrations/` (see `apps/mobile/supabase/migrations/README.md`).
- **`scripts/sync-billing-stripe.mjs`**, `billing-sync.json`

### `packages/shared`

- Navigation (`UserMenu.web.tsx`, `UserMenu.native.tsx`), primitives added/enhanced (`Button`, `Modal`, `Skeleton`) supporting billing UI polish.

---

## Phase 3 — Traceability (REQ → implementation locus)

Locations cite **`billing-v1`** branch files.

| REQ     | Primary mapping                                                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 | `supabase/functions/stripe-webhook/index.ts` (Stripe-driven updates); `supabase/functions/billing-stripe/index.ts` (Stripe API mutations)                                                                                           |
| REQ-002 | `billing_plans.features` JSON + client hooks reading plans (`packages/billing/src/hooks/usePlan.ts`, `useFeature.ts`)                                                                                                               |
| REQ-003 | `billing_products.id`, `billing_plans.product_id`, `billing_subscriptions.product_id` (`supabase/migrations/20250424120000_billing_v1.sql` L7–51)                                                                                   |
| REQ-004 | RPCs `billing_get_remaining_usage`, `billing_has_exceeded_limit` (`20250424120000_billing_v1.sql` L269–352); `useUsage` (`packages/billing/src/hooks/useUsage.ts` L36–94)                                                           |
| REQ-005 | `ensure_billing_subscription` (`20250424120000_billing_v1.sql` L167–214); provider calls RPC (`packages/billing/src/BillingProvider.tsx` L104–112)                                                                                  |
| REQ-006 | `billing_system_flags`, `billing_demo_*` RPCs gated (`20250424120000_billing_v1.sql` L358–449); demo collections gated (`20260426000100_billing_demo_collections.sql`)                                                              |
| REQ-007 | `20250424120000_billing_v1.sql` L7–88 (+ UI migration `20260427120000_billing_ui_v1.sql` for invoice table / split prices)                                                                                                          |
| REQ-008 | Policies `20250424120000_billing_v1.sql` L112–136; invoices policy `20260427120000_billing_ui_v1.sql` L55–59                                                                                                                        |
| REQ-009 | `useFeature` (`packages/billing/src/hooks/useFeature.ts`); boolean gates (`packages/billing/src/components/FeatureGate.web.tsx` L8–17)                                                                                              |
| REQ-010 | `usePlan` + `useSubscription` (`packages/billing/src/hooks/usePlan.ts` — file not fully quoted here; used by pages)                                                                                                                 |
| REQ-011 | `useFeature` numeric/boolean (`packages/billing/src/hooks/useFeature.ts` L22–29)                                                                                                                                                    |
| REQ-012 | RPC `billing_get_remaining_usage` (`20250424120000_billing_v1.sql` L269–326); `useUsage` (`packages/billing/src/hooks/useUsage.ts` L40–66)                                                                                          |
| REQ-013 | RPC `billing_has_exceeded_limit` (`20250424120000_billing_v1.sql` L333–348); consumer exposure via `useUsage.exceeded` (`packages/billing/src/hooks/useUsage.ts` L79–82) — **no standalone exported hook named `hasExceededLimit`** |
| REQ-014 | RPC accepts metadata (`20250424120000_billing_v1.sql` L220–252); client passes `{}` only (`packages/billing/src/hooks/useRecordUsage.ts` L31–38)                                                                                    |
| REQ-015 | `billing-stripe` checkout (`supabase/functions/billing-stripe/index.ts` L81–138); **no `trialDays` / trial_period_days wiring**                                                                                                     |
| REQ-016 | `useCustomerPortal` (`packages/billing/src/hooks/useCustomerPortal.ts` L24–49); Edge `portal` action (`billing-stripe/index.ts` L140–164)                                                                                           |
| REQ-017 | `scheduleCancelToFree` → `downgrade_to_free` (`packages/billing/src/hooks/useBillingStripeActions.ts` L65–67`; `billing-stripe/index.ts` L218–239)                                                                                  |
| REQ-018 | Edge `cancel_immediately` (`billing-stripe/index.ts` L242–261`) — **not exposed via `useBillingStripeActions` / package hooks\*\*                                                                                                   |
| REQ-019 | `usePlanCatalog` (`packages/billing/src/hooks/usePlanCatalog.ts` L25–31`)                                                                                                                                                           |
| REQ-020 | `PricingTable.web.tsx` (`packages/billing/src/components/PricingTable.web.tsx` L7–47`) vs spec props                                                                                                                                |
| REQ-021 | `UpgradePrompt.types.ts` uses **`targetTier`** (`packages/billing/src/components/UpgradePrompt.types.ts` L3–14`) vs **`suggestedPlanId`\*\* in core spec                                                                            |
| REQ-022 | `UsageIndicator.web.tsx` variants (`packages/billing/src/components/UsageIndicator.web.tsx` L11–99); realtime sub refresh applies to **subscriptions only** (`BillingProvider.tsx` L119–153`)                                       |
| REQ-023 | `SubscriptionStatus.web.tsx` / `.native.tsx` present under `packages/billing/src/components/`                                                                                                                                       |
| REQ-024 | `CustomerPortalLink.web.tsx` / `.native.tsx`                                                                                                                                                                                        |
| REQ-025 | `FeatureGate.types.ts` prop **`feature`** (`packages/billing/src/components/FeatureGate.types.ts` L5–11`) vs **`featureName`\*\* snippet                                                                                            |
| REQ-026 | `scripts/sync-billing-stripe.mjs`; config `apps/web/src/billing/billing-sync.json`                                                                                                                                                  |
| REQ-027 | `BillingProvider.tsx` calls `ensure_billing_subscription` (`packages/billing/src/BillingProvider.tsx` L104–112`)                                                                                                                    |
| REQ-028 | `billing_usage_period` (`20250424120000_billing_v1.sql` L145–161`)                                                                                                                                                                  |
| REQ-029 | `stripe-webhook/index.ts` switch (`supabase/functions/stripe-webhook/index.ts` L146–292`)                                                                                                                                           |
| REQ-030 | Signature verification (`stripe-webhook/index.ts` L83–93`, L96–141); duplicate processed (`L106–114`)                                                                                                                               |
| REQ-031 | Edge Functions read **server** secrets (`stripe-webhook/index.ts` L68–76`; documented in `apps/web/docs/billing-testing.md` L7–14`) — **publishable key not referenced inside Edge handlers reviewed**                              |
| REQ-032 | `apps/web/src/billing/beakerstackBillingConfig.ts` supplies ids/copy                                                                                                                                                                |
| REQ-033 | `/billing/*` replaces demo folder (`apps/web/docs/billing-demo.md` L5–8`; routes `apps/web/src/App.tsx` L38–50`)                                                                                                                    |
| REQ-034 | `billing_demo_simulate_upgrade`, `billing_demo_reset_usage` (`20250424120000_billing_v1.sql` L374–449`)                                                                                                                             |
| REQ-035 | **`billing-testing.md`** hosts Stripe CLI guidance (`apps/web/docs/billing-testing.md` L43–65`); **`billing-demo.md`** redirects (`billing-demo.md` L1–16`)                                                                         |
| REQ-036 | `apps/web/src/App.tsx` L38–50`; `BillingProviderLayout.tsx` wraps outlet                                                                                                                                                            |
| REQ-037 | `apps/web/src/components/billing/BillingTabs.web.tsx` L4–17`; pages include tabs (e.g. `BillingOverviewPage.tsx` L52–54`)                                                                                                           |
| REQ-038 | `packages/shared/src/components/navigation/UserMenu.web.tsx` L76–97`; verify native separately                                                                                                                                      |
| REQ-039 | `BillingOverviewPage.tsx`, `CurrentPlanCard.web.tsx`, `OverviewBanners` (`BillingOverviewPage.tsx` L106–149`)                                                                                                                       |
| REQ-040 | `BillingUsagePage.tsx` (imports show UsageIndicator, FeatureLimitRow, PlanFeatureRow, Banner, BillingTabs)                                                                                                                          |
| REQ-041 | `BillingPlansPage.tsx`, `PlanCard.web.tsx`, `CadenceToggle.web.tsx`, `ConfirmDowngradeModal.web.tsx`, `constraintBlockers.ts`                                                                                                       |
| REQ-042 | `BillingInvoicesPage.tsx` + `InvoiceTable.web.tsx`; pagination via `useInvoices` (`packages/billing/src/hooks/useInvoices.ts` L13–24`)                                                                                              |
| REQ-043 | `useBillingState` (`packages/billing/src/hooks/useBillingState.ts` L30–77`); banners `BillingOverviewPage.tsx` L106–149`; **`downgrade_pending` never derived** (`useBillingState.ts` L8–10`)                                       |
| REQ-044 | Migration `20260427120000_billing_ui_v1.sql`; webhook invoice handlers (`stripe-webhook/index.ts` L268–288`, `syncInvoiceRow` L339–392`)                                                                                            |
| REQ-045 | Cases match (`stripe-webhook/index.ts` L254–288`)                                                                                                                                                                                   |
| REQ-046 | `syncInvoiceRow` throws if no user (`stripe-webhook/index.ts` L350–354`) vs UI spec §6 edge-case wording                                                                                                                            |
| REQ-047 | `UsageIndicator.types.ts` variant **`expanded`** (`packages/billing/src/components/UsageIndicator.types.ts` L4–12`); `SubscriptionStatusBadge.\*` in package                                                                        |
| REQ-048 | Dashboard link (`apps/web/src/pages/DashboardPage.tsx` L23–25`); `/billing-demo`route absent`App.tsx`                                                                                                                               |
| REQ-049 | `apps/mobile/src/screens/BillingScreen.tsx` exists — **parity depth not exhaustively audited here**                                                                                                                                 |

---

## Phase 4 — Gap classification

Statuses: **MET**, **PARTIAL**, **DIVERGENT**, **MISSING**, **AMBIGUOUS**.

### Executive summary (also §1 below)

### Traceability table

| REQ ID  | Status    | Code location                                         | Note                                                                                                                                                                                                                                              |
| ------- | --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 | MET       | `stripe-webhook/index.ts` L146–247                    | Stripe events drive subscription rows; checkout writes via upsert after Stripe retrieval                                                                                                                                                          |
| REQ-002 | MET       | `20250424120000_billing_v1.sql` L14–24`, hooks        | Features stored on plans; subscribers inherit via `plan_id`                                                                                                                                                                                       |
| REQ-003 | MET       | `20250424120000_billing_v1.sql` L7–51                 | Composite uniqueness `(user_id, product_id)`                                                                                                                                                                                                      |
| REQ-004 | MET       | RPC + `useUsage.exceeded`                             | App-layer enforcement supported                                                                                                                                                                                                                   |
| REQ-005 | MET       | `ensure_billing_subscription` + `'free'` rows         | Matches intended free-tier semantics                                                                                                                                                                                                              |
| REQ-006 | MET       | Demo RPC gating                                       | Matches appendix defense-in-depth pattern                                                                                                                                                                                                         |
| REQ-007 | MET       | migrations                                            | UI migration adjusts price columns per appendix                                                                                                                                                                                                   |
| REQ-008 | MET       | policies                                              | Webhook paths use service role; tables locked down for anon/authenticated writes                                                                                                                                                                  |
| REQ-009 | PARTIAL   | `useFeature.ts`                                       | Covers boolean gate; **numeric entitlement semantics require app-side counting** (appendix aligns); no standalone **`canUserAccessFeature`** export                                                                                               |
| REQ-010 | MET       | `usePlan.ts` (provider-backed)                        | Equivalent for React consumers                                                                                                                                                                                                                    |
| REQ-011 | PARTIAL   | `useFeature.ts` L22–29                                | Numbers yield **`enabled: true`** always (`L26–27`) — weak match for “numeric limit” interpretation without separate counting                                                                                                                     |
| REQ-012 | MET       | RPC + `useUsage.ts`                                   | Returns period boundaries + limits                                                                                                                                                                                                                |
| REQ-013 | PARTIAL   | `billing_has_exceeded_limit` SQL + `useUsage`         | RPC exists; **package lacks exported function/hook named like spec**                                                                                                                                                                              |
| REQ-014 | PARTIAL   | `useRecordUsage.ts`                                   | RPC supports metadata; hook **fixes `{}`** (`L37`)                                                                                                                                                                                                |
| REQ-015 | MISSING   | `billing-stripe/index.ts` L117–135                    | **`trialDays`** / subscription trial not passed from plan DB fields                                                                                                                                                                               |
| REQ-016 | MET       | `useCustomerPortal.ts`                                | Opens portal URL via Edge                                                                                                                                                                                                                         |
| REQ-017 | MET       | `billing-stripe/index.ts` L236–238                    | Sets **`cancel_at_period_end`**                                                                                                                                                                                                                   |
| REQ-018 | MISSING   | `billing-stripe/index.ts` L242–261                    | Implemented server-side **only**; **no client hook** exposing immediate cancel                                                                                                                                                                    |
| REQ-019 | PARTIAL   | `usePlanCatalog.ts`                                   | Public plans covered; **no dedicated `getPlan(planId)` helper** beyond catalog filtering                                                                                                                                                          |
| REQ-020 | DIVERGENT | `PricingTable.types.ts` L1–6`, `PricingTable.web.tsx` | Props **`onSelectPlan`, `highlightCurrent`** vs spec **`productId`, `currentUserId`, `highlightPlanId`, `onCheckout`** (`beakerstac-billing-v1.md` L359–367`)                                                                                     |
| REQ-021 | DIVERGENT | `UpgradePrompt.types.ts`                              | **`targetTier`** vs **`suggestedPlanId`** (`beakerstac-billing-v1.md` L376–384`)                                                                                                                                                                  |
| REQ-022 | PARTIAL   | `UsageIndicator.web.tsx`, `BillingProvider.tsx`       | Visualization MET for indicators; **usage aggregates do not use realtime channel** — refresh mostly subscription-driven / explicit refresh paths                                                                                                  |
| REQ-023 | MET       | `SubscriptionStatus.*`                                | Present                                                                                                                                                                                                                                           |
| REQ-024 | MET       | `CustomerPortalLink.*`                                | Present                                                                                                                                                                                                                                           |
| REQ-025 | DIVERGENT | `FeatureGate.types.ts`                                | Prop **`feature`** vs snippet **`featureName`** (`beakerstac-billing-v1.md` L428–434`)                                                                                                                                                            |
| REQ-026 | MET       | `scripts/sync-billing-stripe.mjs`                     | Idempotent Stripe price linkage pattern implemented                                                                                                                                                                                               |
| REQ-027 | MET       | `BillingProvider.tsx` L104–112                        | Calls ensure RPC on auth                                                                                                                                                                                                                          |
| REQ-028 | MET       | `billing_usage_period` SQL                            | Free calendar month vs subscription periods encoded                                                                                                                                                                                               |
| REQ-029 | MET       | `stripe-webhook/index.ts`                             | Listed handlers implemented (`checkout.session.completed`, subscription updated/deleted, trial signal noop L250–252`, invoices L254–288`)                                                                                                         |
| REQ-030 | MET       | `stripe-webhook/index.ts` L83–141`, L106–114          | Signature verification + dedupe                                                                                                                                                                                                                   |
| REQ-031 | PARTIAL   | Docs + Edge                                           | **`STRIPE_PUBLISHABLE_KEY`** not consumed in reviewed Edge Functions — acceptable if interpreted as **client-only**, but strict literal REQ only partly evidenced in repo scope audited                                                           |
| REQ-032 | MET       | App billing config                                    | Product vocabulary lives in app layer                                                                                                                                                                                                             |
| REQ-033 | MET       | Docs + `/billing` routes                              | Appendix demo folder replaced; `/billing` exercises flows                                                                                                                                                                                         |
| REQ-034 | MET       | SQL RPCs                                              | Matches gated-template RPC design                                                                                                                                                                                                                 |
| REQ-035 | DIVERGENT | `billing-testing.md`, `billing-demo.md`               | Appendix mandates **`apps/web/docs/billing-demo.md`** as primary CLI doc surface (`beakerstac-billing-v1.md` L837–843`); repo **consolidated into `billing-testing.md`** with **`billing-demo.md` deprecated stub** (`billing-demo.md` L1–16`)    |
| REQ-036 | MET       | `App.tsx` L38–50                                      | Matches ProtectedRoute + nested Billing layout pattern                                                                                                                                                                                            |
| REQ-037 | MET       | `BillingTabs.web.tsx`                                 | Tab routes implemented                                                                                                                                                                                                                            |
| REQ-038 | MET       | `UserMenu.web.tsx` L76–97                             | Order Profile → Billing → Dashboard; CreditCard used                                                                                                                                                                                              |
| REQ-039 | PARTIAL   | `BillingOverviewPage.tsx`                             | Structure broadly matches; **cancelled-pending lacks explicit “reactivate” button** — copy routes users to portal (`BillingOverviewPage.tsx` L131–137`) vs UI spec matrix expecting **reactivate control** (`beakerstack-billing-ui-v1.md` L281`) |
| REQ-040 | MET       | `BillingUsagePage.tsx` + billing components           | Reset semantics + meter + limits surfaces implemented (verified via imports / structure in Phase 2 survey)                                                                                                                                        |
| REQ-041 | MET       | `BillingPlansPage.tsx`, constraints                   | Cadence query params + downgrade modal + blockers present in surveyed sections                                                                                                                                                                    |
| REQ-042 | MET       | `useInvoices.ts` default **pageSize 20** (`L13–14`)   | Matches “next 20” intent                                                                                                                                                                                                                          |
| REQ-043 | PARTIAL   | `useBillingState.ts`, Overview banners                | **Nine-state matrix not fully implemented**: **`downgrade_pending` never emitted** (`useBillingState.ts` L8–10`, `deriveKind` L30–77` lacks downgrade scheduling state); cancelled-pending **reactivate affordance** differs                      |
| REQ-044 | MET       | migrations + webhook                                  | Monthly/annual columns + invoices table                                                                                                                                                                                                           |
| REQ-045 | MET       | `stripe-webhook/index.ts`                             | Invoice lifecycle upserts                                                                                                                                                                                                                         |
| REQ-046 | DIVERGENT | `stripe-webhook/index.ts` L350–354                    | Spec: **log for reconciliation if missing subscription row** (`beakerstack-billing-ui-v1.md` L385`). Code **`throw new Error(...)`\*\* failing webhook processing                                                                                 |
| REQ-047 | MET       | `UsageIndicator.types.ts`, badge components           | Expanded variant + SubscriptionStatusBadge shipped                                                                                                                                                                                                |
| REQ-048 | MET       | `DashboardPage.tsx`, `App.tsx`                        | Manage billing link; no `/billing-demo` route                                                                                                                                                                                                     |
| REQ-049 | AMBIGUOUS | `apps/mobile/.../BillingScreen.tsx`                   | Spec allows follow-up; presence of screen suggests partial parity — **full matrix/visual parity not verified**                                                                                                                                    |

---

### Detailed findings by severity

#### Blocking

None identified as absolute ship-blockers solely from static reading; **closest operational risks**:

1. **`syncInvoiceRow` throws without subscription-customer linkage** — undermines webhook reliability vs explicit reconciliation guidance.

```350:354:supabase/functions/stripe-webhook/index.ts
  if (!userId) {
    throw new Error(
      `No subscription row for Stripe customer ${customerId} (invoice ${invoice.id}); retry after checkout syncs.`
    );
  }
```

Violates UI spec language:

> “If no subscription exists yet (rare timing edge case), **log** to `billing_webhook_events` and let a later subscription-created event reconcile.” (`beakerstack-billing-ui-v1.md` L385`)

#### Significant

1. **`cancelSubscriptionImmediately` not exposed in `@beakerstack/billing` hooks** despite Edge implementation (`billing-stripe` **`cancel_immediately`**).

```242:261:supabase/functions/billing-stripe/index.ts
async function handleCancel(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body
): Promise<Response> {
  ...
  await stripe.subscriptions.cancel(sub.stripe_subscription_id);
  return jsonResponse({ ok: true });
}
```

Core spec public API lists **`cancelSubscriptionImmediately`** (`beakerstac-billing-v1.md` L308–311`).

2. **Checkout ignores configured trials** — core spec ties trials to **`trialPeriodDays`** on plans and checkout-created subscriptions (`beakerstac-billing-v1.md` L539–542`). **`billing-stripe`Checkout.Session.create** includes **no`subscription_data.trial_period_days`** (`billing-stripe/index.ts` L117–135`).

3. **`PricingTable` API diverges from core spec** — props and UX don’t match documented component contract (`beakerstac-billing-v1.md` L359–367`vs`PricingTable.types.ts`/`PricingTable.web.tsx`).

4. **Billing UI state matrix omits “Post-downgrade-pending” / `downgrade_pending`** — explicitly acknowledged as unimplemented in source comments:

```8:10:packages/billing/src/hooks/useBillingState.ts
 * `downgrade_pending` is reserved for a future `scheduled_plan_id` / subscription schedule; v1 does not set it.
```

UI spec matrix row requires Overview banner + Plans indicators (`beakerstack-billing-ui-v1.md` L283–285`).

5. **`recordUsageEvent` metadata plumbing incomplete at hook layer** — RPC accepts **`p_metadata`** (`20250424120000_billing_v1.sql` L223–252`), hook hardcodes `{}`:

```31:38:packages/billing/src/hooks/useRecordUsage.ts
        const { error: rpcErr } = await supabase.rpc(
          'billing_record_usage_event',
          {
            p_product_id: config.productId,
            p_event_type: meterKey,
            p_quantity: quantity,
            p_metadata: {},
          }
        );
```

Core API signature includes **`metadata?: Record<string, any>`** (`beakerstac-billing-v1.md` L271–278`).

#### Minor

1. **Prop naming drift:** `FeatureGate` **`feature`** vs **`featureName`** (`FeatureGate.types.ts` vs `beakerstac-billing-v1.md` L428–434`); **`UpgradePrompt`** **`targetTier`** vs **`suggestedPlanId`** (`UpgradePrompt.types.ts` vs core spec).

2. **`hasExceededLimit` / `getPublicPlans` naming:** Behavior exists under RPC / **`usePlanCatalog`**, but not as documented standalone TS surface — portability for non-React consumers weaker than spec prose.

3. **Documentation path drift:** Appendix insists **`billing-demo.md`** as CLI guide anchor (`beakerstac-billing-v1.md` L837`). Repo intentionally moved content:

```1:4:apps/web/docs/billing-demo.md
# Billing demo (deprecated)

> **Replaced by** production billing at **`/billing`** ...
```

4. **Cancelled subscription UX:** Overview banner tells users to reactivate via portal (`BillingOverviewPage.tsx` L131–137`) rather than providing an explicit **reactivate** CTA per UI table (`beakerstack-billing-ui-v1.md` L281`).

---

## Phase 5 — Reverse check (code vs spec)

Sample of **`billing-v1` vs `main`** changes **without** a direct REQ counterpart — categorized.

### Infrastructure / scaffolding

- **`packages/shared` primitives** (`Button`, `Modal`, `Skeleton`) — UI spec §10 open questions anticipated primitives for billing pages (`beakerstack-billing-ui-v1.md` L428–432`).
- **CI / deploy workflows** (`\.github/workflows/*.yml`) — operational wiring for Edge Functions and previews.
- **`packages/test-utils`, coverage scripts** (`scripts/merge-coverage.js`) — test hygiene.
- **Symlinked / mirrored skill docs** (`.agents`, `.augment`, `.claude` paths in diff stat) — repo housekeeping, not billing behavior.

### Undocumented features (relative to specs)

- **`update_subscription` / cadence switching** via **`billing-stripe`** (`billing-stripe/index.ts` L167–215`) — **extends** core checkout/downgrade API; aligns with UI cadence spec but not enumerated as named TS functions in core billing spec §Public API.
- **Realtime subscription refresh** (`BillingProvider.tsx` L119–153`) — improves UX beyond explicit spec text.

### Possible scope creep / ancillary changes

- **`FormButton` refactors** (`packages/shared/src/components/forms/FormButton.*`) — adjacent UI primitive churn beyond billing-only scope (may support Modal/Button adoption).
- **`skills-lock.json`, `.changeset`** — release/process artifacts.

---

## 5 — Open questions and assumptions

1. **Whether core spec “Public API” MUST be exported verbatim as functions** vs hooks/RPC — interpreted as **functional equivalence acceptable for React monorepo**, but non-React adopters would notice gaps (`hasExceededLimit`, `cancelSubscriptionImmediately`).
2. **`stripe.listen` documentation anchor file** — appendix vs repo consolidation — treat **`billing-testing.md`** as authoritative **unless** strict appendix compliance is required.
3. **Mobile parity depth** — `BillingScreen.tsx` exists; full four-route parity vs web was **not** line-verified for this audit.

---

## 1 — Executive summary

The **`billing-v1`** branch delivers the bulk of **BeakerStack Billing v1** and **Billing UI v1**: schema/RPCs in migrations, **`stripe-webhook`** and **`billing-stripe`** Edge Functions, a substantial **`@beakerstack/billing`** hook/component library, **`/billing`** routes with Overview/Usage/Plans/Invoices, cadence-aware Stripe checkout and subscription updates, invoice mirroring, pg tests, and docs consolidated under **`apps/web/docs/billing-testing.md`**. Strong alignment exists on **Stripe-as-source-of-truth**, **free-tier ensure RPC**, **usage period logic**, **RLS posture**, **invoice upserts**, and **PlanCard/BillingTabs** UX.

Gaps cluster around **literal API/component contracts** in the core spec (**PricingTable props**, **`UpgradePrompt`/`FeatureGate` naming**, **`trialDays` checkout**, **`cancelSubscriptionImmediately` exposure**, **`recordUsage` metadata**), **UI state completeness** (**post-downgrade-pending**, richer cancelled-pending **reactivate** affordance), and **one webhook edge-case behavior** (**invoice sync throws** vs **log-and-reconcile**). Documentation location diverges from the appendix path (**`billing-demo.md`** vs **`billing-testing.md`**) by deliberate deprecation notes rather than omission of content.
