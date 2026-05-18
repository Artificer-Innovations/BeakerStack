# Billing — testing & verification

Production routes: **`/billing`**, `/billing/usage`, `/billing/plans`, `/billing/invoices`. Config: `apps/web/src/billing/beakerstackBillingConfig.ts`. Stripe price sync: `apps/web/src/billing/billing-sync.json` and `npm run billing:sync-stripe`.

## Environment

| Variable                                       | Purpose                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase client                                                                         |
| `VITE_BILLING_DEMO_MODE`                       | When `true`, web UI may show demo RPC controls (must match server)                      |
| `STRIPE_*`                                     | Used by Edge Functions (Supabase Dashboard → Edge Function secrets), not in the browser |

`STRIPE_PUBLISHABLE_KEY` is read in Edge (`stripe-webhook`, `billing-stripe`) for configuration parity with the billing spec; checkout and Elements still consume the publishable key from **client** env (e.g. `VITE_*`). Edge calls use only the secret key.

**Deploy target (`billing_deploy_target`):** Checkout stamps each session (and subscription metadata) with a label derived from `SUPABASE_URL` / `BILLING_SUPABASE_URL` (Supabase project ref for hosted `*.supabase.co`, otherwise **`local`**). The webhook ignores events for another deployment at ingress (redacted payload in `billing_webhook_events`) and on `checkout.session.completed` / `customer.subscription.*`. Set optional **`BILLING_WEBHOOK_TARGET`** on both Edge functions only if you override the default (same value in `supabase/.env.local` for local serve).

**Multiple BeakerStack apps / shared Stripe account:** use a separate webhook endpoint + `whsec` per Supabase project and app-scoped `productId` in `billing-sync.json`. See [stripe-billing-setup.md](../../../docs/stripe-billing-setup.md) (Multiple BeakerStack apps).

**Invoice race:** if Stripe delivers an invoice before `checkout.session.completed` creates the local subscription row, the webhook ignores the invoice at ingress (or skips sync in the handler) without failing; a later `invoice.paid` or Stripe retry reconciles after the owned row exists.

Server: `billing_system_flags` row `demo_billing_mode = true` enables `billing_demo_simulate_upgrade` and `billing_demo_reset_usage` (local `supabase/seed.sql` sets this in dev).

## `useBillingState` matrix (9 states)

Derived in `packages/billing/src/hooks/useBillingState.ts` and reflected in `Banner` / badges on the billing pages:

1. **loading** — no subscription data yet; skeletons/loading UI.
2. **no_subscription** — no current subscription row; free-tier/post-cancellation state before/without a `free` row.
3. **free** — explicit free subscription state.
4. **paid_active** — paid subscription (`active`, and currently also `paused`/`incomplete`/`unpaid` in derive logic).
5. **cancelled_pending** — `cancel_at_period_end` and still in paid period.
6. **payment_failed** — `past_due` / failed payment.
7. **trialing** — in trial.
8. **trial_ending** — trial ends soon (derived from `trial_end` threshold).
9. **downgrade_pending** — `cancel_at_period_end` with `pending_target_plan_id` set.

Use **Stripe** for realistic transitions where possible; use **demo RPCs** to jump plans without a card when `demo_billing_mode` is on.

### Demo RPCs (Supabase)

```sql
-- Simulate upgrade to a plan_id (e.g. beakerstack_pro)
select billing_demo_simulate_upgrade(
  p_product_id => 'beakerstack',
  p_plan_id      => 'beakerstack_pro'
);

select billing_demo_reset_usage();
```

## Stripe CLI — webhook checks

Prerequisites: `supabase start`, `supabase functions serve` with the same env as `stripe-webhook` (e.g. `./supabase/.env.local`), Stripe CLI logged in (`stripe login`).

Forward webhooks:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Use the **webhook signing secret** from the CLI as `STRIPE_WEBHOOK_SECRET` for that session (or the Dashboard for a fixed endpoint).

### Shared Stripe account fan-out (two Supabase projects)

Register **two** Stripe webhook endpoints (Dashboard or two `stripe listen` forwards to different local ports/projects). Trigger billing on **one** BeakerStack app only; in the **other** app’s Supabase Studio, open `billing_webhook_events`:

- `error` should be `ignored: billing_deploy_target_mismatch`, `ignored: unknown_stripe_subscription`, or similar.
- `payload` should be redacted (`redacted: true`, no `data.object` with customer PII).
- `billing_invoices` and `billing_subscriptions` should not change for foreign events.

### Useful triggers

Confirm rows in `billing_webhook_events`, `billing_subscriptions`, and (for invoices) `billing_invoices` in Supabase Studio.

| Scenario                    | Command                                                                            | Notes                                       |
| --------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| Invoice payment failed      | `stripe trigger invoice.payment_failed`                                            | May set subscription `past_due` when linked |
| Subscription updated        | `stripe trigger customer.subscription.updated`                                     | Status/period sync                          |
| Trial will end (signal)     | `stripe trigger customer.subscription.trial_will_end`                              | Logged; email is app concern                |
| Invoice created / lifecycle | `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.voided` as needed | Invoices table upserts                      |
| Idempotency                 | Re-run same `stripe trigger` or resend in Dashboard                                | `stripe_event_id` must dedupe               |

## Sync Stripe prices to the database

```bash
export STRIPE_SECRET_KEY=sk_test_...
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<service_role from `supabase status`>
npm run billing:sync-stripe
```

Paid plans get `stripe_price_id_monthly` / `stripe_price_id_annual` in `public.billing_plans`.

## Manual Checkout

Run the web app, sign in, go to **`/billing/plans`**, use test card `4242 4242 4242 4242` (any future CVC, any ZIP). Return URLs use `/billing` paths. After success, confirm `billing_subscriptions` and webhook rows.

## Mobile

`EXPO_PUBLIC_BILLING_DEMO_MODE` and `EXPO_PUBLIC_BILLING_DEMO_BASE_URL` (LAN URL for return URLs on device). Billing package smoke screen: `apps/mobile/src/screens/BillingScreen.tsx`. Full tab parity is web-first; the native app links users to the web for the complete `/billing` UI if needed.

## Routes

Production billing lives at **`/billing`**, `/billing/usage`, `/billing/plans`, and `/billing/invoices`. The old `/billing-demo` route was removed; use `/billing` instead.
