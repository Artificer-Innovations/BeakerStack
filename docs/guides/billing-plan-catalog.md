# Billing plan catalog (features and usage limits)

This guide is the **checklist for changing entitlements** in Beaker Stack: booleans, numeric caps, and metered `usage_limits`. It complements [stripe-billing-setup.md](../stripe-billing-setup.md) (Stripe keys, webhooks, price sync).

## Source of truth

| Layer                                                                                                                                 | Role                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **`public.billing_plans`**                                                                                                            | **Runtime source of truth** for `features` and `usage_limits`. Hooks read the plan row by `billing_subscriptions.plan_id`.                  |
| **App billing config** ([`apps/web/src/billing/beakerstackBillingConfig.ts`](../../apps/web/src/billing/beakerstackBillingConfig.ts)) | TypeScript catalog: `defineBillingConfig`, `planFeatureRows`, copy for UI. Must match DB or the plan page and RPCs disagree.                |
| **Stripe**                                                                                                                            | Prices and subscriptions. `stripe-webhook` resolves `plan_id` from Stripe price IDs; it does **not** overwrite `features` / `usage_limits`. |

**`trial_period_days`:** when non-zero on a paid plan, Edge checkout passes it to Stripe as `subscription_data.trial_period_days`. Keep config, seeds, and `billing:apply-plans` in sync. Involuntary return to Free after a trial is covered in [beakerstack-billing-v1.md §Involuntary downgrade](../specs/beakerstack-billing-v1.md).

Changing a row in **`billing_plans`** applies **immediately** to every subscription with that `plan_id`. **Usage counts** (`billing_usage_aggregates`) are unchanged; only limits and feature flags change, so `remaining` and gates update on the next read.

There is **no per-user snapshot** of entitlements on `billing_subscriptions` for features (only `plan_id`). **Grandfathering** different limits on the same Stripe price is not supported without new schema (out of scope for v1).

## Footgun: missing meter keys in `usage_limits`

`billing_get_remaining_usage` treats a meter as **unlimited** when that `event_type` key is **absent** from the plan’s `usage_limits` JSON (not “zero usage”). When you add a new meter, add an explicit numeric limit for **every** plan tier that should be capped (use `-1` in config / DB convention for unlimited where applicable).

Removing a meter key without a coordinated app change can unintentionally grant **unlimited** use for that `event_type`.

## Change checklist

| Change                      | Edit in app                             | Database                                                    | Usage / notes                                                                                   |
| --------------------------- | --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Add boolean feature         | `plans[].features`, `planFeatureRows`   | Push with `billing:apply-plans` or SQL `UPDATE`             | Missing key behaves as false in boolean UI / `useFeature`.                                      |
| Add meter                   | `plans[].usageLimits`, `usageMeterCopy` | Same                                                        | Every plan row needs a key or the meter is **unlimited** on that tier.                          |
| Raise / lower cap           | Config + DB                             | Same                                                        | `used` unchanged; `remaining` recomputes.                                                       |
| Rename a meter `event_type` | Config + app call sites                 | `UPDATE` + optional migration of `billing_usage_aggregates` | Old `event_type` rows no longer count toward the new key unless migrated.                       |
| Remove a feature key        | Config + references                     | Replace JSON                                                | For meters, prefer explicit policy (e.g. stop invoking RPC) rather than deleting the key alone. |

## Files to keep aligned (template)

- [`apps/web/src/billing/beakerstackBillingConfig.ts`](../../apps/web/src/billing/beakerstackBillingConfig.ts)
- [`supabase/seed.sql`](../../supabase/seed.sql) and [`apps/mobile/supabase/seed.sql`](../../apps/mobile/supabase/seed.sql) (same billing seed; used on `supabase db reset`)

After editing the TypeScript catalog, run **`npm run billing:apply-plans`** against each environment that should match, **or** update seeds if you only care about fresh local resets.

## Apply script vs SQL migration

### `npm run billing:apply-plans` (default for iteration)

- Pushes `features`, `usage_limits`, and safe display fields from the billing config module into **`billing_plans`** using the **service role**.
- **Does not** modify Stripe price columns (`stripe_price_id_monthly`, `stripe_price_id_annual`, `stripe_product_id`).
- Requires **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`**. Never expose the service role in client apps.
- Use **`--dry-run`** to print the payload that would be written for each plan (no Supabase credentials required; no database calls).

Use this for local, PR preview, staging, or production when you are comfortable applying DML outside a migration file.

### Versioned SQL migration (audit trail)

- Add a migration under `supabase/migrations/` that `UPDATE`s `billing_plans` (or uses `jsonb_set`) so the change is reviewed in PR and applied with your normal `db push` / pipeline.
- Prefer this when compliance or release process requires **all** database changes in git.

You can use **both**: migration in git for production, and the script locally for speed—as long as the **canonical** definition (TS config or migration) wins and people do not overwrite each other unintentionally.

## Running `billing:apply-plans`

From the **repository root**, with Supabase credentials for the target project:

```bash
export SUPABASE_URL="https://<PROJECT_REF>.supabase.co"   # or http://127.0.0.1:54321 locally
export SUPABASE_SERVICE_ROLE_KEY="<service_role key>"

npm run billing:apply-plans
# Preview only:
npm run billing:apply-plans -- --dry-run
```

The script loads [`beakerstackBillingConfig`](../../apps/web/src/billing/beakerstackBillingConfig.ts) by default and updates one row per plan `id` under `productId`. If a plan id is missing from the database, the script exits with an error (it does not insert plans).

To load a different module (must export `beakerstackBillingConfig` or a `default` catalog with `productId` and `plans`):

```bash
export BILLING_PLAN_CONFIG_MODULE="apps/web/src/billing/beakerstackBillingConfig.ts"
npm run billing:apply-plans
```

Stripe price sync remains **`npm run billing:sync-stripe`** ([stripe-billing-setup.md](../stripe-billing-setup.md)).

## Environment checklist

Apply changes (script or migration) everywhere you maintain real data:

1. Local Docker (`supabase start` — often `db reset` reapplies seeds instead)
2. PR preview Supabase
3. Staging
4. Production

## Related code (for debugging)

- Plan fetch: `packages/billing/src/hooks/usePlan.ts` → `billing_plans` by `plan_id`
- Usage: `billing_get_remaining_usage` in `supabase/migrations/20250424120000_billing_v1.sql`
- Plan card lines: `apps/web/src/billing/planPresentation.ts` → `planFeatureLine(plan, row)` uses **`plan.features`** from the DB-backed `Plan`
