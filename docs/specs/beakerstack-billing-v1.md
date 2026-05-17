# Beaker Stack Billing v1

**Shared billing and entitlements infrastructure for Artificer Innovations factory products.**

_A module within Beaker Stack, open source MIT_

**Version:** 1.0 Draft
**Purpose:** Technical specification for minimal v1 billing features supporting B2C SaaS projects

> **Status:** Implemented in `@beakerstack/billing` and the Beaker Stack template. This spec may lag the codebase in minor API naming; use [`apps/web/docs/billing-testing.md`](../../apps/web/docs/billing-testing.md) for operational QA.

---

## Purpose

Beaker Stack Billing is a shared module within the Beaker Stack full-stack template that provides subscription billing, entitlements management, and usage tracking. It's designed to serve multiple products from a single implementation, supporting the Artificer Innovations factory's need for consistent billing infrastructure across seed products.

V1 is scoped specifically to what simple B2C SaaS products needs for launch, plus a few forward-compatible design choices that make v2 cleaner. The goal is shippable infrastructure in 3-4 weeks, not a complete billing platform.

## Scope

### In scope for v1

- Stripe integration (checkout, webhooks, customer portal)
- Subscription lifecycle management (active, past_due, canceled, trialing)
- Multiple tiers per product (free, pro, agency)
- Feature entitlements (can user access feature X at their plan Y)
- Usage tracking and limits (30 posts/month for free tier)
- Plan upgrade and downgrade flows
- Free tier support (user has plan but no Stripe subscription)
- Trial period support
- Failed payment dunning (via Stripe's built-in logic)
- Reusable React components for pricing pages and upgrade prompts
- Multi-product support (one user can have subscriptions to multiple factory products)

### Out of scope for v1

- Team-based billing (seats, multiple users on one subscription)
- Usage-based billing (posts charged per unit)
- Custom enterprise pricing
- Coupons and discount codes (use Stripe's native support if needed)
- Complex proration scenarios (accept Stripe's defaults)
- Invoice customization (Stripe defaults only)
- Multi-currency support (USD only)
- Tax handling beyond Stripe's automatic tax
- Refund logic (manual via Stripe dashboard)
- Affiliate or referral tracking
- Detailed billing analytics (MRR dashboards, cohort analysis)
- Annual plan auto-renewal handling with upgrade credits

All of these are legitimate future additions as specific products require them. V1 ships without them.

## Architecture

### Design principles

**Principle 1: Stripe is the source of truth for subscription state.**

Never maintain subscription state that contradicts Stripe. All changes originate from Stripe webhooks or from actions that immediately write to Stripe and wait for the webhook confirmation. This prevents the classic "my database says they're paid but Stripe says they canceled" bug.

**Principle 2: Entitlements are derived, not stored directly.**

A user's current entitlements are computed from their active subscription plus their product-level configuration. This means changing a plan's feature list automatically updates all existing subscribers without requiring database migrations.

**Principle 3: Multi-product from day one.**

The schema and APIs support multiple products from the start. Adding multiple simple B2C SaaS products should require zero schema changes to Beaker Stack Billing.

**Principle 4: Usage limits enforced at the application layer.**

Beaker Stack Billing tracks usage events but does not automatically prevent actions when limits are hit. Each product calls `getRemainingUsage()` and decides how to handle limit exhaustion (typically by showing an upgrade prompt, but products can implement their own logic).

**Principle 5: Free tier is first class.**

Free tier users aren't a lesser class of user. They have full accounts, full entitlement tracking, and full access to features their plan includes. They just don't have a Stripe subscription. The system handles this cleanly without special cases throughout the codebase.

**Principle 6: Demo behavior lives at the application layer, not in the module.**

The billing module itself has exactly two modes: Stripe test mode and Stripe live mode, distinguished by configuration. Demo-mode shortcuts (simulated upgrades without a Stripe roundtrip, instant tier changes for exploration, etc.) are implemented by consuming applications, not by the billing module. This keeps the module focused on real billing while still allowing demo sites like beakerstack.com to implement smooth demo experiences at their own layer.

### System overview

```
┌─────────────────────────────────────────────┐
│          Product Application                │
│  (simple B2C SaaS product, future seeds, etc.)            │
└────────────┬────────────────────────────────┘
             │
             │ API calls
             ▼
┌─────────────────────────────────────────────┐
│     Beaker Stack Billing Module               │
│  - Entitlement checks                        │
│  - Usage tracking                            │
│  - Subscription management                   │
│  - Stripe integration                        │
└────────────┬────────────────────────────────┘
             │
        ┌────┴────┐
        ▼         ▼
   ┌─────────┐  ┌──────────────┐
   │Postgres │  │  Stripe API  │
   │(Supabase)│  │              │
   └─────────┘  └──────────────┘
```

The module is a combination of database schema, server-side logic (Supabase Edge Functions), and client-side React components.

## Database schema

```sql
-- Products registered in the system
create table billing_products (
  id text primary key, -- 'seed_1', 'seed_2', etc.
  display_name text not null,
  description text,
  created_at timestamptz default now()
);

-- Plans within each product
create table billing_plans (
  id text primary key, -- 'seed_1_free', 'seed_1_pro', etc.
  product_id text references billing_products not null,
  display_name text not null,
  description text,
  price_cents int not null default 0, -- 0 for free plans
  billing_period text not null, -- 'monthly', 'yearly', 'one_time', 'free'
  stripe_price_id text, -- null for free plans
  stripe_product_id text, -- null for free plans
  features jsonb not null default '{}', -- feature name → true/false or limit
  usage_limits jsonb not null default '{}', -- event_type → monthly limit
  trial_period_days int default 0,
  is_public boolean default true, -- visible in pricing page
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users' subscriptions (one row per user per product)
create table billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id text references billing_products not null,
  plan_id text references billing_plans not null,
  stripe_customer_id text,
  stripe_subscription_id text, -- null for free plans
  status text not null, -- 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'free'
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, product_id) -- one active subscription per user per product
);

-- Usage events (written by products, read for limit enforcement)
create table billing_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id text references billing_products not null,
  event_type text not null, -- product-defined, e.g. 'post_published'
  quantity int default 1,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Pre-aggregated usage for efficient limit checks
create table billing_usage_aggregates (
  user_id uuid not null,
  product_id text not null,
  event_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  count int not null default 0,
  primary key (user_id, product_id, event_type, period_start)
);

-- Webhook event log for debugging and replay
create table billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz default now()
);

-- Indexes for common query patterns
create index idx_subs_user_product on billing_subscriptions(user_id, product_id);
create index idx_usage_user_product_type_time on billing_usage_events(user_id, product_id, event_type, created_at);
create index idx_aggregates_lookup on billing_usage_aggregates(user_id, product_id, event_type, period_start);
```

### Row Level Security policies

Users can see their own subscriptions and usage events but cannot modify them directly. All subscription changes happen through server-side functions that validate Stripe webhook authenticity.

```sql
alter table billing_subscriptions enable row level security;
alter table billing_usage_events enable row level security;
alter table billing_usage_aggregates enable row level security;

create policy "Users see own subscriptions"
  on billing_subscriptions for select
  using (user_id = auth.uid());

create policy "Users see own usage"
  on billing_usage_events for select
  using (user_id = auth.uid());

create policy "Users see own aggregates"
  on billing_usage_aggregates for select
  using (user_id = auth.uid());
```

Products, plans, and webhook events are readable by authenticated users but only writable through server-side administrative functions.

## Public API

The module exposes a TypeScript API consumed by product applications.

### Core entitlement functions

```typescript
// Check if a user can access a specific feature in a product
async function canUserAccessFeature(
  userId: string,
  productId: string,
  featureName: string
): Promise<boolean>;

// Get the current plan for a user + product
async function getUserPlan(
  userId: string,
  productId: string
): Promise<Plan | null>;

// Get a specific feature value (could be boolean or numeric limit)
async function getFeatureValue<T = boolean | number>(
  userId: string,
  productId: string,
  featureName: string
): Promise<T | null>;

// Get remaining usage for a specific event type in the current period
async function getRemainingUsage(
  userId: string,
  productId: string,
  eventType: string
): Promise<{
  used: number;
  limit: number | null; // null means unlimited
  remaining: number | null; // null means unlimited
  periodEnd: Date;
}>;

// Check if user has exceeded their limit for an event type
async function hasExceededLimit(
  userId: string,
  productId: string,
  eventType: string
): Promise<boolean>;
```

### Usage tracking

```typescript
// Record a usage event
async function recordUsageEvent(
  userId: string,
  productId: string,
  eventType: string,
  quantity?: number,
  metadata?: Record<string, any>
): Promise<void>;
```

### Subscription management

```typescript
// Initiate Stripe checkout for a plan upgrade
async function initiateCheckout(
  userId: string,
  productId: string,
  planId: string,
  options?: {
    successUrl?: string;
    cancelUrl?: string;
    trialDays?: number;
  }
): Promise<{ checkoutUrl: string; sessionId: string }>;

// Get Stripe customer portal URL
async function getCustomerPortalUrl(
  userId: string,
  returnUrl?: string
): Promise<string>;

// Schedule move to free at end of billing period (Stripe cancel_at_period_end; not immediate).
// Edge function `billing-stripe` JSON body: action `schedule_cancel_to_free`.
async function scheduleCancelToFree(
  userId: string,
  productId: string
): Promise<void>;

// Cancel subscription immediately (not at period end)
async function cancelSubscriptionImmediately(
  userId: string,
  productId: string
): Promise<void>;
```

### Plan information

```typescript
// Get all public plans for a product
async function getPublicPlans(productId: string): Promise<Plan[]>;

// Get a specific plan by ID
async function getPlan(planId: string): Promise<Plan | null>;
```

## Stripe webhook handler

A single edge function handles all Stripe webhook events for billing.

```typescript
// supabase/functions/stripe-webhook/index.ts

Events handled:
- checkout.session.completed: create subscription record, set status
- customer.subscription.updated: update subscription status, period dates
- customer.subscription.deleted: mark as canceled
- customer.subscription.trial_will_end: trigger notification (email sent by product)
- invoice.payment_failed: update status to past_due, trigger notification
- invoice.payment_succeeded: log successful payment, reset dunning
```

Each webhook:

1. Verifies Stripe signature
2. Logs event to `billing_webhook_events`
3. Processes event (updates subscription state)
4. Records result in webhook_events table
5. Returns 200 to Stripe

Idempotent: processing the same event twice has no effect. Important because Stripe retries webhooks.

## React components

Reusable UI components that products import.

### PricingTable

Displays all public plans for a product with upgrade CTAs.

```tsx
<PricingTable
  productId='seed_1'
  currentUserId={user?.id}
  highlightPlanId='seed_1_pro'
  onCheckout={planId => {
    /* custom handler */
  }}
/>
```

Renders a pricing comparison. Shows current plan for logged-in users. Upgrade CTAs open Stripe checkout via `initiateCheckout`.

### UpgradePrompt

Shown when a user hits a usage limit or tries to access a gated feature.

```tsx
<UpgradePrompt
  productId='seed_1'
  reason="You've reached your monthly post limit"
  suggestedPlanId='seed_1_pro'
  onUpgrade={() => {
    /* after successful upgrade */
  }}
/>
```

### UsageIndicator

Shows current usage vs limit for a specific event type.

```tsx
<UsageIndicator
  productId='seed_1'
  eventType='post_published'
  label='Posts this month'
/>
```

Renders a progress bar or similar visualization. Updates in real time as usage changes.

### SubscriptionStatus

Displays current subscription info with management links.

```tsx
<SubscriptionStatus
  productId='seed_1'
  onManage={() => {
    /* opens customer portal */
  }}
/>
```

### CustomerPortalLink

Simple link that opens the Stripe customer portal.

```tsx
<CustomerPortalLink productId='seed_1' returnUrl={window.location.href}>
  Manage subscription
</CustomerPortalLink>
```

### FeatureGate

Conditionally renders content based on feature entitlement.

```tsx
<FeatureGate
  productId="seed_1"
  featureName="api_access"
  fallback={<UpgradePrompt ... />}
>
  <ApiKeyManagement />
</FeatureGate>
```

## Configuration approach

Each product configures its plans via a declarative config file that seeds the database.

```typescript
// products/seed_1/billing-config.ts
export const poststackBillingConfig: ProductBillingConfig = {
  productId: 'seed_1',
  displayName: 'Seed 1',
  description: 'Precision cross-posting for multi-brand operators',
  plans: [
    {
      id: 'seed_1_free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      features: {
        workspaces_max: 2,
        accounts_per_workspace_max: 3,
        analytics_basic: true,
        analytics_advanced: false,
        api_access: false,
      },
      usageLimits: {
        post_published: 30, // per month
      },
      isPublic: true,
      displayOrder: 1,
    },
    {
      id: 'seed_1_pro',
      displayName: 'Pro',
      priceCents: 1900,
      billingPeriod: 'monthly',
      stripePriceId: 'price_...',
      features: {
        workspaces_max: -1, // unlimited
        accounts_per_workspace_max: -1,
        analytics_basic: true,
        analytics_advanced: true,
        api_access: true,
      },
      usageLimits: {}, // no limits
      trialPeriodDays: 0,
      isPublic: true,
      displayOrder: 2,
    },
    {
      id: 'seed_1_agency',
      displayName: 'Agency',
      priceCents: 4900,
      billingPeriod: 'monthly',
      stripePriceId: 'price_...',
      features: {
        workspaces_max: -1,
        accounts_per_workspace_max: -1,
        analytics_basic: true,
        analytics_advanced: true,
        api_access: true,
        team_members_max: 5,
        white_label: false, // v2
      },
      usageLimits: {},
      trialPeriodDays: 5,
      isPublic: true,
      displayOrder: 3,
    },
  ],
};
```

A setup script reads this config and creates/updates the corresponding Stripe products, prices, and database records. Running the script is idempotent.

## Free tier handling

When a user signs up without selecting a plan:

1. User account is created via Supabase Auth
2. On first product access, check for subscription record
3. If none exists, auto-create a free tier subscription
4. Free subscription has `status = 'free'` and no Stripe subscription ID
5. Entitlement checks work normally against the free plan's features

When a free user upgrades:

1. Initiate checkout via `initiateCheckout`
2. Stripe handles payment
3. Webhook fires on success
4. Free subscription is updated to paid plan, status becomes `active` or `trialing`
5. Stripe customer and subscription IDs are recorded

When a paid user schedules cancel to free:

1. `scheduleCancelToFree` is called (or `billing-stripe` with `action: 'schedule_cancel_to_free'`)
2. Stripe subscription is set to `cancel_at_period_end`
3. Paid plan entitlements continue until the current billing period ends
4. At period end, webhook fires; subscription is transitioned to the free plan
5. Free plan limits apply from that point forward

## Trial handling

Trials are managed by Stripe. When a plan has `trialPeriodDays > 0` (stored on `billing_plans.trial_period_days` and passed as `subscription_data.trial_period_days` when creating the Checkout Session):

1. Checkout creates a subscription with a trial period
2. Stripe sets `trial_end` based on configuration
3. Webhook updates our subscription record with trial dates
4. Entitlements work normally during trial (user gets paid plan features)
5. Stripe emits `customer.subscription.trial_will_end` before trial end. **v1 default:** the billing module does not require in-app “trial ending soon” messaging; Stripe attempts conversion to paid at `trial_end` when a default payment method exists. Optional product email or analytics may subscribe to `trial_will_end` outside this module.
6. At trial end, Stripe attempts the first paid invoice; on success the subscription becomes `active`. If the customer cancels during trial, payment cannot be collected, or the subscription is otherwise removed, the user may return to Free via webhooks without going through the interactive downgrade flow (see **Involuntary downgrade to Free**).

Users can cancel during trial via customer portal without charge.

## Involuntary downgrade to Free (grace + remediation)

This applies when `billing_subscriptions.plan_id` becomes the **free** plan because of Stripe lifecycle events **without** the user completing the Plans-page downgrade flow—for example: subscription deleted after trial without conversion, cancellation, or other webhook-driven transitions to Free.

**v1 product policy**

1. **No automatic deletion** of customer content to satisfy Free limits.
2. **Remediation:** the product should **block new** actions that would exceed Free limits (meters, boolean features, or structural caps such as collections/items) until the user reduces usage or data to within Free limits **or** upgrades again. Acceptable patterns include read-only mode, blocking creates only, or explicit “resolve overage” UI with links to delete data and/or billing.
3. **User-initiated downgrade** (Plans page, `computeDowngradeBlockers`) remains the path where the app can preflight hard blockers before the user commits; involuntary Free **does not** run that preflight.

**Metered usage caveat**

`billing_get_remaining_usage` scopes “used” counts to `billing_usage_period`, which switches from the Stripe subscription period to a **calendar month** when the row becomes Free. Aggregate rows keyed to the previous billing period may no longer match the new period window, so displayed “used” for a meter can appear to **reset** until new events accrue in the calendar month. Strict cross-period overage display is **follow-up** work if the product requires it.

## Usage limit enforcement

Products call `recordUsageEvent` when a limit-affecting action occurs (e.g. `post_published`).

The module:

1. Records the event in `billing_usage_events`
2. Updates the current period's `billing_usage_aggregates` record
3. Returns immediately

Separately, products call `hasExceededLimit` before allowing limit-affected actions:

```typescript
// In Seed 1's publish logic
const limitExceeded = await hasExceededLimit(userId, 'seed_1', 'post_published');
if (limitExceeded) {
  throw new UsageLimitExceededError('Monthly post limit reached. Upgrade to Pro for unlimited.');
}
// Proceed with publishing
await publishPost(...);
await recordUsageEvent(userId, 'seed_1', 'post_published');
```

Products are responsible for handling the limit exceeded case (typically by showing an upgrade prompt).

### Period boundaries

Usage periods align with subscription billing periods. For monthly plans, the period is the current billing month. For users on free tier, the period is calendar month (Jan 1 to Jan 31, Feb 1 to Feb 28, etc.).

At period start, aggregates reset for limit-enforcement purposes. Historical events remain in `billing_usage_events` for analytics.

## Error handling

**Stripe API errors:** returned to caller with clear error messages. Don't leak Stripe-specific details to end users.

**Webhook failures:** logged to `billing_webhook_events` with error details. Can be replayed manually if needed.

**Race conditions:** use database transactions where state must be consistent. Stripe is the source of truth; if our state diverges, a reconciliation job (future work) can detect and correct.

**Missing subscriptions:** if a user has no subscription record for a product, auto-create a free tier subscription. Fails safely toward "user has free access."

**Expired trials with no payment method:** Stripe handles this; webhook updates subscription to `incomplete` or `canceled`. User sees prompt to add payment method.

## Security considerations

**Webhook verification:** all incoming Stripe webhooks validate signature. Unsigned requests rejected.

**Customer portal:** uses Stripe's hosted customer portal. No sensitive payment data touches our servers.

**Plan configuration:** only editable by administrators, not by end users. No UI for users to modify plans.

**Usage events:** users can see their own usage but not modify it. Recording events happens server-side.

**Cross-product isolation:** RLS ensures users only see data for products they have subscriptions to.

## Stripe modes and demo handling

The billing module supports Stripe's two standard modes (test and live) through environment variable configuration. Demo-mode behavior for showcase sites is implemented at the application layer, not in the module.

### Environment configuration

The module reads Stripe credentials from environment variables:

```
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

Test mode keys (prefixed `pk_test_` and `sk_test_`) hit Stripe's test infrastructure. No real charges occur. Test card numbers like 4242 4242 4242 4242 produce successful test transactions.

Live mode keys (prefixed `pk_live_` and `sk_live_`) hit Stripe's production infrastructure. Real charges occur. Real credit cards are required.

The module itself is agnostic to which mode is configured; Stripe handles the distinction. Applications using the module just need to ensure they've configured the correct mode for their environment.

### Recommended usage pattern

- **Development and staging environments:** always use test mode
- **Production deployments of real products:** use live mode
- **Demo sites showcasing Beaker Stack capabilities:** always use test mode, never live mode
- **Never mix modes within an environment:** test subscriptions cannot be converted to live subscriptions

A misconfiguration where a production environment accidentally uses test keys results in payments failing silently (Stripe rejects the test keys for live transactions or processes them as test). The inverse (test environment using live keys) is worse: real charges could occur in a demo or development context. Guard against this with environment variable management discipline.

### Application-layer demo mode (for demo sites)

Consuming applications that want to demonstrate billing capabilities without requiring visitors to enter test card numbers should implement demo-mode shortcuts at the application layer. The billing module does not provide demo mode itself; this is deliberate to keep the module focused on real billing.

A typical demo-mode implementation at the application layer:

- Application reads a `DEMO_MODE` flag from its own environment or config
- When `DEMO_MODE=true`, upgrade buttons in the pricing UI bypass Stripe checkout and directly update the user's subscription record via a server-side function
- The direct update uses a service role Supabase client to change the subscription's `plan_id` and `status` fields
- Usage limits and entitlements then work normally against the "upgraded" subscription
- An optional "see real checkout" alternate path invokes the normal Stripe test mode flow for visitors who want to see it

This pattern lets demo sites show clean instant upgrades by default while preserving access to the real checkout flow for developers evaluating the implementation.

### beakerstack.com specific behavior

The Beaker Stack demo site at beakerstack.com implements application-layer demo mode as described above. Specifically:

- Stripe test mode is configured (test keys only, never live)
- Default upgrade path shortcuts Stripe entirely for faster exploration
- Alternate "see real checkout" path runs the full Stripe test mode flow with test card numbers displayed
- Persistent demo banner visible across all pages
- Demo accounts accumulate without automatic reset (deferred; manual cleanup as needed)
- README documents the demo vs production configuration clearly

This approach serves as the reference implementation for other Beaker Stack users who want to build their own demo sites.

### Mode switching for new Beaker Stack users

When a developer clones Beaker Stack to build their own product, the README walks them through:

1. Creating a Stripe account (free)
2. Obtaining test mode API keys
3. Configuring test keys in development environment
4. Creating test products and prices in Stripe
5. Mapping those to plans in their product's billing config
6. Testing the full subscription flow with test cards
7. When ready for production, obtaining live mode keys and switching configuration

The mode switch itself is a configuration change, not a code change. The billing module behaves identically in both modes.

## Open source considerations

Because Beaker Stack is open source MIT, Beaker Stack Billing is also open source. This means:

**Generic enough for others to use.** Don't hardcode Artificer Innovations specifics. The module should work for any Stripe-based SaaS using Supabase.

**Clear documentation.** README explains setup: creating Stripe account, configuring webhook, adding plans, integrating with an app.

**Example configuration.** Include a sample product configuration (could be for a hypothetical "ExampleApp") so new users see how to structure their own products.

**No secret configuration leaks.** Stripe keys and similar secrets live in environment variables, never in the repo.

**Contribution posture:** accept PRs for bug fixes and additional platform support. New major features discussed via issue first.

## Migration and compatibility

V1 has no migration concerns because it's the first version. Future versions will handle:

**Schema migrations:** Supabase migration scripts, forward-compatible where possible.

**API compatibility:** TypeScript function signatures preserved; new features added through additional parameters or functions.

**Plan changes:** existing subscriptions preserved when plan definitions change; users on legacy plans continue on those plans until they upgrade or downgrade.

## Timeline estimate

**Week 1: Foundation and schema.**

- Schema design and migration scripts
- Stripe account setup and test products
- Basic module structure and types

**Week 2: Core functions.**

- Subscription management functions
- Entitlement check functions
- Usage tracking functions
- Webhook handler for critical events

**Week 3: UI components and product integration.**

- React components (PricingTable, UpgradePrompt, etc.)
- Integration with Seed 1 (first real consumer)
- Configuration system for products

**Week 4: Polish and edge cases.**

- Trial handling refinement
- Error handling and edge cases
- Documentation
- Testing across subscription lifecycle scenarios

Total: 3-4 weeks of focused work. Parallelizable with some of Seed 1's non-billing work.

## Success criteria for v1

V1 is successful if:

1. Seed 1 launches with free, Pro, and Agency tiers working correctly
2. Users can sign up for free tier, upgrade to Pro, downgrade, cancel
3. Usage limits enforce correctly on free tier
4. Trial periods work as configured
5. Stripe webhooks handle standard subscription lifecycle events
6. No data loss or state inconsistency between Stripe and our database over first 30 days of operation
7. Module is documented well enough that a future factory seed can integrate it in under a day

V1 is not trying to be a complete billing platform. It's trying to support Seed 1 reliably while being forward-compatible with future factory products.

## What comes after v1

Likely v1.5 or v2 additions based on future product needs:

- Usage-based billing (charge per unit of usage)
- Team seats and multi-user subscriptions
- Custom enterprise pricing workflows
- More sophisticated trial-to-paid conversion flows
- Advanced analytics and reporting
- Multi-currency support
- Tax handling (beyond Stripe's automatic)
- Webhooks emitted to consumer apps for subscription events
- Admin dashboard for support team use

Each of these is a real need but not for Seed 1 v1 launch. Build them when a specific product requires them.

### Demo infrastructure improvements (deferred from v1)

Related to demo handling, some items deferred from v1 that will need attention as beakerstack.com and similar demo sites scale:

- Automatic demo account data reset (nightly truncation or inactivity-based cleanup). V1 handles this manually; automation becomes important when demo data volume grows.
- Demo account lifecycle policies (time-limited accounts, session-based accounts, anonymous exploration without signup). Different demo experiences may want different behaviors.
- Reset orchestration across products (if multiple factory products share infrastructure, coordinated resets matter).
- Analytics separation for demo vs real usage (so product metrics don't include demo site noise).

These are beakerstack.com and future-demo-site concerns rather than billing module concerns specifically, but worth tracking here because they interact with billing state.

---

## Appendix: Beaker Stack open-source template (billing v1 alignment)

This section extends the billing spec for the **Beaker Stack** monorepo: a production-quality `packages/billing` module plus a **template-level** B2C demo. It does not change the core architectural principles above; it constrains how the factory ships the module and how the template validates it.

### Template goals

1. Ship a production-quality `packages/billing` module per this document’s core architecture.
2. Build a meaningful B2C-flavored demonstration in `apps/web` (and mirror key pieces in `apps/mobile`) that exercises enough of the module surface to genuinely validate it, not just render a pricing table.
3. Draw a clean, explicit line between the reusable billing module and the Beaker Stack template app layer.

### Tier structure: Free / Pro / Max (template demo)

The template demo ships three tiers with a consumer-SaaS aesthetic. The **structural shape** matches multi-workspace products: parent container cap, items per container cap, metered monthly action, and boolean upgrades — without prescribing a sepecifc product domains.

| Entitlement             | Free | Pro       | Max       |
| ----------------------- | ---- | --------- | --------- |
| Containers per account  | 2    | unlimited | unlimited |
| Items per container     | 3    | 25        | unlimited |
| Metered action / period | 30   | 500       | unlimited |
| Boolean feature A       | off  | on        | on        |
| Boolean feature B       | off  | off       | on        |

Plan ids (e.g. `beakerstack_free`, `beakerstack_pro`, `beakerstack_max`) and Stripe price mappings are **owned by the template app**, not hardcoded in `packages/billing`.

### Demo domain (neutral B2C)

**Collections** of **saved items**, with a metered **“AI summarize”** action.

**Rationale:** “Collection” / “saved item” maps directly to hierarchical caps (containers and items), reads as neutral B2C product surface (similar affordances to Readwise-style saving), and does not imply a specific Artificer shipping product. Alternates with the same entitlement shape: projects/tasks with “AI breakdown,” or notebooks/notes with “AI rewrite.”

### Three entitlement surfaces (template)

The template exercises all three shapes in two places:

- **Dashboard playground** (`/dashboard`) — annotated primitives for metered usage, numeric caps (collections/items), and boolean gates (see `apps/web/src/pages/DashboardPage.tsx`).
- **Production billing** (`/billing`, `/billing/usage`, …) — product-style pages per [beakerstack-billing-ui-v1.md](./beakerstack-billing-ui-v1.md).

1. **Metered action surface** — Wired to `hasExceededLimit`, `recordUsageEvent`, `UsageIndicator`, and `UpgradePrompt` at the boundary. Must visibly show **reset-date semantics**: Free = **calendar month**; paid = **billing period** (from `getRemainingUsage` / `periodEnd`).
2. **Numeric feature value surface** — Uses `getFeatureValue` for **containers per account** and **items per container**. Does **not** use the usage events table for those caps. Attempting to exceed limits shows an **inline** limit message with upgrade CTA.
3. **Boolean feature gate surface** — Uses `FeatureGate` for features A and B, with `UpgradePrompt` fallback that targets the **minimum** tier required (A → Pro, B → Max). Tier resolution is supplied by the **app** (props or app helper), not baked into the package.

### Module vs app boundary

| Concern                                                               | `packages/billing` | `apps/web` / `apps/mobile` (template)          |
| --------------------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| Types; Zod schema for **config shape**                                | Yes                | Provides concrete config                       |
| Client API; hooks; UI (web + native)                                  | Yes                | Wires routes, copy, ids                        |
| Stripe: checkout, portal, schedule cancel to free, cancel immediately | Yes                | URLs, env, product id                          |
| Tier names, marketing copy, domain vocabulary                         | No                 | Yes                                            |
| Feature keys, metered `eventType` strings                             | No                 | Yes                                            |
| `simulateUpgrade` / demo usage reset                                  | **Must not**       | Yes (template-only RPCs)                       |
| Demo banner (“not real billing”)                                      | No                 | Yes (dashboard + optional demo controls)       |
| Collections/items demo state, dashboard playground                    | No                 | Yes (`apps/web/src/billing/`, dashboard pages) |

**Principle:** A consumer may remove the dashboard playground and demo RPC wiring and retain a fully working `@beakerstack/billing`. Adapting the template = rename domain + swap keys, **without** editing `packages/billing`.

### `simulateUpgrade` and demo usage reset (template only)

- **Location:** Supabase RPCs (e.g. `billing_demo_simulate_upgrade`, `billing_demo_reset_usage`) in template-scoped migrations, **or** a dedicated Edge Function — **not** in `packages/billing`.
- **Behavior:** For `auth.uid()`, updates `billing_subscriptions` plan/status for the template product without a Stripe roundtrip; reset clears usage aggregates/events for the demo meter as defined by the template.
- **Security:** `SECURITY DEFINER` (or service role from gated Edge) with a **server-side guard** (e.g. database setting, config row, or project-only flag) so the RPC **refuses** when demo mode is off. Client may use `VITE_BILLING_DEMO_MODE` for UX only — **not** sufficient alone.
- **UX:** Clear **“Demo mode — not real billing”** labeling; optional **“See real checkout”** path using normal Stripe test flow via the billing module.

### Webhook testing (v1)

**Primary approach:** [Stripe CLI](https://stripe.com/docs/stripe-cli) forwarding to the **local** `stripe-webhook` Edge Function, using real Stripe payload shapes and signature verification.

Document in **`apps/web/docs/billing-testing.md`** (canonical CLI walkthrough), including exact commands for:

- `invoice.payment_failed` (past_due / dunning behavior)
- `customer.subscription.trial_will_end`
- `customer.subscription.updated`
- `invoice.payment_succeeded`
- **Retry idempotency** (same event twice / retry simulation — no duplicate side effects; `billing_webhook_events` + subscription consistency)

**Explicit non-goal for v1:** No admin **“simulate webhook”** UI in the template — avoids payload drift and scope creep.

### Implementation checklist (Beaker Stack repo — shipped)

- DB migration: billing tables, RLS, core RPCs (`record_usage_event`, reads, `ensure_free`), pgTAP under **`supabase/migrations/`** at repo root.
- Edge Functions: `stripe-webhook`, `billing-stripe`; secrets and CI deploy.
- `packages/billing`: generic module (no product vocabulary).
- Stripe sync script driven by **app-supplied** billing config (`npm run billing:sync-stripe`).
- App: Free/Pro/Max config; `/billing` route family; dashboard playground; mobile smoke screen.
- Template RPCs: demo upgrade + usage reset with server-side gating.
- Docs: [`docs/stripe-billing-setup.md`](../stripe-billing-setup.md), [`apps/web/docs/billing-testing.md`](../../apps/web/docs/billing-testing.md).
