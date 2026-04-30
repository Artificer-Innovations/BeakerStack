# Billing — testing & verification

Production routes: **`/billing`**, `/billing/usage`, `/billing/plans`, `/billing/invoices`. Config: `apps/web/src/billing/beakerstackBillingConfig.ts`. Stripe price sync: `apps/web/src/billing/billing-sync.json` and `npm run billing:sync-stripe`.

## Environment

| Variable                                       | Purpose                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase client                                                                         |
| `VITE_BILLING_DEMO_MODE`                       | When `true`, web UI may show demo RPC controls (must match server)                      |
| `STRIPE_*`                                     | Used by Edge Functions (Supabase Dashboard → Edge Function secrets), not in the browser |

`STRIPE_PUBLISHABLE_KEY` is read in Edge (`stripe-webhook`, `billing-stripe`) for configuration parity with the billing spec; checkout and Elements still consume the publishable key from **client** env (e.g. `VITE_*`). Edge calls use only the secret key.

**Deploy target (`billing_deploy_target`):** Checkout stamps each session with a label derived from `SUPABASE_URL` / `BILLING_SUPABASE_URL` (Supabase project ref for hosted `*.supabase.co`, otherwise **`local`**). The webhook skips completed checkouts when metadata targets another deployment. You normally need no extra env; set optional **`BILLING_WEBHOOK_TARGET`** on both Edge functions only if you override the default (same value in `supabase/.env.local` for local serve).

**Invoice race:** if Stripe delivers an invoice event before `billing_subscriptions` links the Stripe customer (rare around checkout), the webhook logs and skips that upsert instead of failing the handler; a later subscription/checkout event reconciles.

Server: `billing_system_flags` row `demo_billing_mode = true` enables `billing_demo_simulate_upgrade` and `billing_demo_reset_usage` (local `supabase/seed.sql` sets this in dev).

## `useBillingState` matrix (9 states)

Derived in `packages/billing/src/hooks/useBillingState.ts` and reflected in `Banner` / badges on the billing pages:

1. **loading** — no subscription data yet; skeletons/loading UI.
2. **free** — on free plan (no active paid sub).
3. **active** — paid subscription, status `active`.
4. **cancelled_pending** — `cancel_at_period_end` and still in paid period.
5. **payment_failed** — `past_due` / failed payment.
6. **trial_active** — in trial.
7. **trial_ending** — trial ends soon (when surfaced by backend/data).
8. **downgrade_pending** — schedule to lower tier (when applicable).
9. (Implicit) **cancelled** — no longer subscribed after period end; often collapses to **free** in UI.

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

## Legacy

The old `/billing-demo` route has been removed. If you have bookmarks, use `/billing` instead. See [billing-demo.md](./billing-demo.md) (deprecated) for any retained historical notes.
