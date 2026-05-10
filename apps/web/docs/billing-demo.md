# Billing demo (deprecated)

> **Replaced by** production billing at **`/billing`** (Overview, Usage, Plans, Invoices) and the testing doc **[billing-testing.md](./billing-testing.md)**.

The former `apps/web/src/billing-demo/` app folder and `/billing-demo` route have been removed. Template config now lives at:

- `apps/web/src/billing/beakerstackBillingConfig.ts`
- `apps/web/src/billing/billing-sync.json` (for `npm run billing:sync-stripe`)

## Webhook testing (Stripe CLI)

Use **[billing-testing.md](./billing-testing.md)** for the authoritative walkthrough: `stripe listen` forwarding to `stripe-webhook`, signing secrets, invoice lifecycle triggers, and **idempotency** (`billing_webhook_events` dedupe).

**Invoice / subscription race (local QA):** if an `invoice.*` event arrives before checkout has linked `stripe_customer_id` on `billing_subscriptions`, the webhook **skips** invoice upsert with a log line and returns **200** so Stripe does not retry indefinitely; a later event reconciles once the row exists.

## Mobile

See `apps/mobile/src/screens/BillingScreen.tsx` and `apps/mobile/src/billing/beakerstackBillingConfig.ts` for the native dev surface that wraps `@beakerstack/billing`.

## Historical content

Prior versions of this file documented Stripe CLI triggers, env vars, and sync steps; those are consolidated in **[billing-testing.md](./billing-testing.md)** with updated paths and invoice coverage.
