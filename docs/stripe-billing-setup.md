# Stripe billing setup (Beaker Stack)

This guide walks you from **zero** to a working **test-mode** Stripe integration with Beaker Stack’s billing stack: **Supabase Postgres** (`billing_*` tables), **Edge Functions** (`stripe-webhook`, `billing-stripe`), and the **web/mobile** apps using `@beakerstack/billing`.

**Related docs (narrower topics):**

- [supabase/functions/README.md](../supabase/functions/README.md) — Edge Function names, secrets list, local `serve` command.
- [apps/web/docs/billing-testing.md](../apps/web/docs/billing-testing.md) — Stripe CLI triggers, idempotency, demo env flags, `useBillingState` matrix.
- [guides/billing-plan-catalog.md](guides/billing-plan-catalog.md) — Features, `usage_limits`, `npm run billing:apply-plans`, and when to use SQL migrations.

---

## Before the Stripe wizard phase

If you use `npm run setup:full`, the **stripe** phase (after **supabase**, before **write** / **github**) collects GitHub Actions keys so you are not surprised by `STAGING_STRIPE_SECRET_KEY` at github sync. For each **hosted** Supabase project (`https://<ref>.supabase.co`), the wizard uses the same logic as CI ([`scripts/lib/ensure-stripe-webhook.mjs`](../scripts/lib/ensure-stripe-webhook.mjs)) to create or update the Stripe webhook and store `*_STRIPE_WEBHOOK_SECRET` when Stripe returns a new signing secret.

### Checklist

| #   | Requirement                      | Details                                                                                                                                                                                                                                                                 |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Stripe account**               | [dashboard.stripe.com](https://dashboard.stripe.com) — **Test mode** for preview + staging.                                                                                                                                                                             |
| 2   | **API secret keys**              | Developers → API keys → `sk_test_…` (preview/staging) and `sk_live_…` (production when ready).                                                                                                                                                                          |
| 3   | **Webhook per Supabase project** | One endpoint per preview/staging/production at `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`. **Greenfield:** wizard/CI create it from `sk_*` only. **Existing endpoint:** paste `whsec_…` from Dashboard → **Reveal** if the secret was never saved. |
| 4   | **Supabase URLs from setup**     | Complete the **supabase** phase first so the wizard can ensure webhooks against the correct URL.                                                                                                                                                                        |

Skip billing in CI: answer **N** at the stripe phase or `npm run setup:full -- --skip-stripe`.

**More:** [setup-prep-checklist.md § stripe](setup-prep-checklist.md#stripe)

---

## 0. Billing model overview (what you are actually setting up)

Beaker Stack uses Stripe for **commercial billing primitives** and Supabase for **application-side entitlement state**.

### Source of truth split

- **Stripe is the commercial source of truth** for products, prices, subscriptions, invoices, payment state, and customer portal actions.
- **Supabase is the app source of truth** for feature gating and app queries (`billing_subscriptions`, usage records, plan checks), kept in sync from Stripe events.

### What you configure in Stripe

In Stripe, you are setting up:

1. **Products and Prices** for your paid plans (for the template: `beakerstack_pro`, `beakerstack_max`).
2. **Webhook endpoints** that deliver subscription/payment lifecycle events to each Supabase project.
3. **Customer Portal settings** (what users can change/cancel/manage).
4. (Optional) Dashboard-level controls like tax, invoice branding, retry/dunning behavior.

This repo’s `billing:sync-stripe` command can create/update Products and Prices for you from config so Stripe and `billing_plans` stay aligned.

### How checkout + sync works

1. App calls Edge Function `billing-stripe` to create a Checkout Session for a plan. If `billing_plans.trial_period_days` is greater than zero for that plan, the session includes `subscription_data.trial_period_days` so Stripe creates a **trialing** subscription until `trial_end`, then attempts the first paid charge.
2. Stripe completes payment and emits webhook events.
3. `stripe-webhook` verifies signatures and upserts `billing_subscriptions` (idempotent).
4. App reads Supabase billing tables/RPCs to decide what features are enabled.

**After trial or failed paid state:** if the user lands on **Free** without using the interactive downgrade flow, see the **Involuntary downgrade to Free (grace + remediation)** section in [beakerstack-billing-v1.md](specs/beakerstack-billing-v1.md) (meter period caveat and remediation expectations).

### Practical rule

If a plan is paid, it must have a valid Stripe Price and the matching `billing_plans.stripe_price_id`. If that link is missing, checkout is not ready.

### Environment model (Beaker Stack default)

Beaker Stack runs four stack versions, each with its own Supabase target and billing wiring:

| Environment | Supabase target                       | Stripe key mode                | Webhook endpoint in Stripe                                                      |
| ----------- | ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| Local dev   | Local Docker Supabase                 | Test (`sk_test`)               | Usually Stripe CLI forward to localhost                                         |
| PR preview  | Shared preview Supabase cloud project | Test (`sk_test`)               | Preview project `https://<PREVIEW_REF>.supabase.co/functions/v1/stripe-webhook` |
| Staging     | Staging Supabase cloud project        | Test (`sk_test`)               | Staging project `https://<STAGING_REF>.supabase.co/functions/v1/stripe-webhook` |
| Production  | Production Supabase cloud project     | Live (`sk_live`) after go-live | Production project `https://<PROD_REF>.supabase.co/functions/v1/stripe-webhook` |

Keep a separate Stripe webhook endpoint + `whsec` per hosted Supabase project. Do not reuse one `whsec` across environments.

### Deploy target hardening (Checkout)

Stripe **test mode** can deliver the same events to every registered webhook URL. To avoid `checkout.session.completed` upserts in the wrong Supabase project, Checkout Sessions include metadata **`billing_deploy_target`**, set by Edge from the project’s Supabase URL (project ref for `https://<ref>.supabase.co`) or `local` for Docker / localhost. The `stripe-webhook` function ignores completed checkouts when that metadata is **present** and does not match its own deploy target (HTTP **200** with `{ "received": true, "ignored": true }`); legacy events **without** the key are still processed. Optional secret **`BILLING_WEBHOOK_TARGET`** overrides the derived value when the URL is not `*.supabase.co` — set identically on `billing-stripe` and `stripe-webhook` for that project.

**Deploy order:** ship **`billing-stripe` before or with `stripe-webhook`** so new sessions include `billing_deploy_target` before the webhook enforces mismatches (missing metadata remains processed until clients use the updated checkout).

### Multiple BeakerStack apps (shared Stripe account)

When you run **more than one BeakerStack-based app** (each with its own Supabase project) against **one Stripe account**, Stripe test mode delivers the same events to **every** registered webhook URL. Use this checklist:

1. **Separate Supabase project per app** — each deployment gets its own `auth.users` and `billing_*` tables.
2. **Separate Stripe webhook endpoint per project** — unique URL and `STRIPE_WEBHOOK_SECRET` (`whsec_…`); never reuse secrets across projects.
3. **App-scoped `productId`** in each app’s `billing-sync.json` / seeds (e.g. `myapp`, `myotherapp`), not a bare name like `pro`. Required if two apps ever share one Supabase database (`UNIQUE (user_id, product_id)`).
4. Deploy **`billing-stripe` before `stripe-webhook`** on every project that shares the Stripe account so subscription metadata includes `billing_deploy_target`.

**Webhook hardening (`stripe-webhook`):**

- **Ingress classification** runs after signature verification, **before** processing billing tables, and when choosing the stored `payload` (full event vs **redacted**). Foreign events are still inserted into `billing_webhook_events` for idempotency, but without customer/invoice bodies (`redacted: true`), and return HTTP **200** `{ "received": true, "ignored": true }` without mutating subscriptions or invoices.
- **`billing_deploy_target`** is enforced on `customer.subscription.*` (from subscription metadata, same semantics as checkout).
- **Subscription and invoice handlers** only mutate rows when a local `billing_subscriptions` row exists for the event’s `stripe_subscription_id`. Invoice sync no longer resolves users by `stripe_customer_id` alone (avoids cross-app invoice mirroring when customers are shared).
- Optional: rows whose `product_id` is not in `billing_products` are ignored (shared-DB safety).

`BILLING_WEBHOOK_TARGET` is per **Supabase project** (deploy ref), not per app product name. Two BeakerStack apps on the **same** Supabase project need distinct `product_id` values, not deploy-target alone.

---

## 1. How the pieces connect

| Piece                               | Role                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe Dashboard**                | Products/prices (or created by sync script), **webhook endpoint** URL pointing at your project, **API keys**.                            |
| **Supabase Edge `billing-stripe`**  | Authenticated user calls: create Checkout Session, Customer Portal, cancel/downgrade. Uses `STRIPE_SECRET_KEY`.                          |
| **Supabase Edge `stripe-webhook`**  | Stripe → you: verifies signature with `STRIPE_WEBHOOK_SECRET`, updates `billing_subscriptions`. Uses **service role** to write Postgres. |
| **`billing_plans.stripe_price_id`** | Checkout needs a real Stripe Price ID on each paid plan row. Use `npm run billing:sync-stripe` (see §7) or set manually in Stripe + DB.  |
| **Web app**                         | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only; **never** put `STRIPE_SECRET_KEY` in the browser.                                   |

**Important:** Subscription rows are created/updated from **webhooks** (and Checkout metadata). The Edge checkout handler attaches metadata: `supabase_user_id`, `product_id`, `plan_id`, and `billing_deploy_target` so `checkout.session.completed` can upsert `billing_subscriptions` and filter cross-environment webhook fan-out.

---

## 2. Prerequisites

- [Stripe account](https://dashboard.stripe.com/register) (use **Test mode** until you intentionally go live).
- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed (`stripe login`) for local webhook forwarding.
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker for local Supabase, **or** a hosted Supabase project for remote-only setup.
- Repo dependencies: `npm install` from the monorepo root.

---

## 3. Stripe Dashboard — API keys (test mode)

1. Open [Stripe Dashboard](https://dashboard.stripe.com/) and turn **Test mode** on (toggle in the header).
2. Go to **Developers → API keys**.
3. Copy:
   - **Publishable key** — `pk_test_…` (optional for future client-side Stripe.js; Beaker Stack billing checkout is mostly server-driven via Edge).
   - **Secret key** — `sk_test_…` → this value is `STRIPE_SECRET_KEY` for Edge Functions and for the sync script.

Keep secret keys out of git; use Supabase Dashboard secrets and local `.env` files that are gitignored.

---

## 4. Supabase — database and billing seed

Billing tables and RPCs ship in migrations (e.g. `supabase/migrations/*_billing_v1.sql`). Apply them to the database you will use:

**Local:** run these from the **repository root** so `supabase/migrations/` is applied.

```bash
supabase start
supabase db reset   # applies migrations + seed; wipes local data
```

**Hosted:** use `supabase link` + `supabase db push` (see [supabase-staging-production-setup.md](supabase-staging-production-setup.md)).

Seed data (when using repo `supabase/seed.sql`) includes the template product **`beakerstack`** and plans **`beakerstack_free`**, **`beakerstack_pro`**, **`beakerstack_max`**. Paid plans start with **`stripe_price_id` null** until you run the sync script (§7) or paste Price IDs from Stripe.

---

## 5. Stripe Dashboard — webhook endpoint (hosted Supabase)

When **Stripe’s servers** must call your project (staging/production, or a stable tunnel), register the webhook in Stripe. **`npm run setup:full`** (stripe phase) and deploy CI (`npm run stripe:ensure-webhook`) can create or update this endpoint for `https://<ref>.supabase.co` projects automatically; use the manual steps below if you prefer the Dashboard or need to **Reveal** an existing signing secret.

1. **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL** (replace placeholders):

   `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
   - `PROJECT_REF` is in the Supabase project URL (Dashboard → Project Settings → API → Project URL).

3. **Events to send** — at minimum select the types the template handler implements (you can also use “Receive all events” while testing):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_failed`
   - `invoice.paid`
   - `invoice.payment_succeeded`

4. After saving, open the webhook details and **Reveal** the **Signing secret** (`whsec_…`). That value is **`STRIPE_WEBHOOK_SECRET`** for the **same** Stripe mode (test vs live) as your API keys.

### 5.1 If one Stripe account serves multiple apps/projects

Use **one webhook endpoint per deployed project/environment** (do not share one endpoint URL across all apps):

| Stripe endpoint                                       | Points to                                                           | Secret used in                     |
| ----------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| `beakerstack-web-staging`                             | `https://<WEB_STAGING_REF>.supabase.co/functions/v1/stripe-webhook` | Web staging Supabase secrets       |
| `beakerstack-web-production`                          | `https://<WEB_PROD_REF>.supabase.co/functions/v1/stripe-webhook`    | Web production Supabase secrets    |
| `beakerstack-mobile-production` (if separate backend) | `https://<MOBILE_PROD_REF>.supabase.co/functions/v1/stripe-webhook` | Mobile production Supabase secrets |

Rules of thumb:

- Each endpoint gets its **own** signing secret (`whsec_...`); store that secret only in the matching Supabase project as `STRIPE_WEBHOOK_SECRET`.
- Reuse the same Stripe account safely by separating at least by **environment** (staging vs production), and by **backend project** when apps are backed by different Supabase projects.
- Keep event subscriptions aligned with what each project handles; this avoids noisy/unneeded deliveries.
- In Dashboard, give endpoints clear names (`<app>-<env>-stripe-webhook`) so key rotation and incident response stay simple.

If multiple frontends (web + mobile) share the **same Supabase project**, they can share that project’s single webhook endpoint and secret.

**Local development** usually skips the Dashboard URL and uses **Stripe CLI** instead (§8) so your laptop receives events without a public URL.

---

## 6. Supabase — Edge Function secrets

For **each** Supabase project (local secrets file for `serve`, or Dashboard for hosted):

| Secret                                                            | Where to get it                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                                               | Stripe Dashboard → API keys → Secret key (`sk_test_…` or `sk_live_…`).                                                                                                                                                              |
| `STRIPE_WEBHOOK_SECRET`                                           | Stripe webhook signing secret (`whsec_…`) for the endpoint that points at **this** project’s `stripe-webhook`, **or** the secret printed by `stripe listen` for local dev. Never reuse a `whsec` from a different endpoint/project. |
| `SUPABASE_URL` / `BILLING_SUPABASE_URL`                           | Project API URL (`https://<PROJECT_REF>.supabase.co`). Dashboard may use `SUPABASE_URL`; **`supabase secrets set` skips names starting with `SUPABASE_`**, so CI uses **`BILLING_SUPABASE_URL`**. Functions accept either.          |
| `SUPABASE_ANON_KEY` / `BILLING_SUPABASE_ANON_KEY`                 | Dashboard: **anon public** key. CLI/CI: use **`BILLING_SUPABASE_ANON_KEY`** so `billing-stripe` can call `auth.getUser()` even when hosted default `SUPABASE_ANON_KEY` is missing or mismatched.                                    |
| `SUPABASE_SERVICE_ROLE_KEY` / `BILLING_SUPABASE_SERVICE_ROLE_KEY` | Dashboard: **service_role** key. CLI/CI: use **`BILLING_SUPABASE_SERVICE_ROLE_KEY`** when setting secrets via the CLI.                                                                                                              |

**Supabase Dashboard:** Project Settings → **Edge Functions** → **Secrets**.

**CLI (linked project):**

```bash
cd supabase
supabase link --project-ref "<PROJECT_REF>" --password "<DB_PASSWORD>" --yes
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  BILLING_SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  BILLING_SUPABASE_ANON_KEY="<anon_public>" \
  BILLING_SUPABASE_SERVICE_ROLE_KEY="<service_role>" \
  BILLING_ALLOWED_ORIGINS="https://your-app.example"
```

Deploy the functions after DB is ready (CI passes `--project-ref`; locally you can use the same after `link`):

```bash
supabase functions deploy stripe-webhook billing-stripe --project-ref "<PROJECT_REF>"
```

See [supabase/functions/README.md](../supabase/functions/README.md) for JWT behavior (`stripe-webhook` has **verify_jwt disabled** so Stripe can POST without a Supabase JWT).

---

## 7. Stripe products and prices → database (`stripe_price_id`)

Checkout fails if `billing_plans.stripe_price_id` is null for a paid plan. The repo includes:

- **Sync config:** [packages/billing/src/presentation/billing-sync.json](../packages/billing/src/presentation/billing-sync.json) — lists paid `planId`s and monthly/annual amounts for the template product.
- **Script:** `npm run billing:sync-stripe` → runs [scripts/sync-billing-stripe.mjs](../scripts/sync-billing-stripe.mjs).

**CI:** [`.github/workflows/pr-preview-environment.yml`](../.github/workflows/pr-preview-environment.yml), [`deploy-staging.yml`](../.github/workflows/deploy-staging.yml), and [`deploy-production.yml`](../.github/workflows/deploy-production.yml) run **`npm run billing:sync-stripe`** after the database is migrated (preview: after the preview DB prepare step; staging/production: after `supabase db push`) and **before** deploying Edge Functions, so `billing_plans` always has Stripe price IDs for checkout without a manual sync.

From the **repo root**, with keys for the **same** Supabase project and Stripe account (manual runs when debugging or before CI existed):

```bash
export STRIPE_SECRET_KEY=sk_test_...
export SUPABASE_URL=https://<PROJECT_REF>.supabase.co   # or http://127.0.0.1:54321 for local
export SUPABASE_SERVICE_ROLE_KEY=<service_role key>

npm run billing:sync-stripe
# equivalent: node scripts/sync-billing-stripe.mjs --config packages/billing/src/presentation/billing-sync.json
```

The script creates or reuses a Stripe Product (tagged with `billing_product_id` metadata), creates Prices as needed, and **updates** `billing_plans` rows for the listed `planId`s.

For your own product, **copy** `billing-sync.json`, change `productId` / `planId`s to match **your** `billing_products` / `billing_plans` rows and amounts, then run the same command with `--config path/to/your-sync.json`.

**`features` / `usage_limits` on `billing_plans`** are not touched by `billing:sync-stripe`. After editing the app billing config, run **`npm run billing:apply-plans`** (or follow a SQL migration workflow) as described in [guides/billing-plan-catalog.md](guides/billing-plan-catalog.md).

---

## 8. Local end-to-end (Docker Supabase + Stripe CLI)

### 8.1 Start Supabase and apply schema

```bash
supabase start
supabase db reset
```

Note `API URL` and `anon key` and `service_role key` from `supabase status`.

### 8.2 Local Edge secrets file

Create **`supabase/.env.local`** (gitignored — do not commit):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # use value from stripe listen (next step)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role from supabase status>
```

### 8.3 Serve Edge Functions locally

From repo root:

```bash
cd supabase
supabase functions serve --no-verify-jwt --env-file .env.local
```

Leave this running. Default functions URL is **`http://127.0.0.1:54321/functions/v1/<name>`**.

### 8.4 Forward Stripe webhooks to local `stripe-webhook`

In a second terminal (after `stripe login`):

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Copy the **`whsec_...`** the CLI prints into **`STRIPE_WEBHOOK_SECRET`** in `supabase/.env.local`, then **restart** `supabase functions serve` so the new secret is picked up.

### 8.5 Sync Stripe prices to local DB

```bash
export STRIPE_SECRET_KEY=sk_test_...
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<service_role from supabase status>
npm run billing:sync-stripe
```

### 8.6 Point the web app at local Supabase

In `apps/web` (or root) `.env` / `.env.local` as you already do for the template:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>
```

Optional demo UI flags (see [apps/web/docs/billing-testing.md](../apps/web/docs/billing-testing.md)):

```env
VITE_BILLING_DEMO_MODE=true
```

Run the web app (`npm run web`), sign in, open **`/billing/plans`**, and use **real Checkout** (test card `4242 4242 4242 4242`, any future CVC/ZIP). After payment, **`checkout.session.completed`** should populate `billing_subscriptions` in Studio.

**Webhook testing recipes:** [apps/web/docs/billing-testing.md](../apps/web/docs/billing-testing.md) (Stripe CLI `trigger` commands).

---

## 9. Hosted Supabase (staging / production) checklist

1. Create or select the Supabase project; run **migrations** (`supabase db push` or your pipeline).
2. Set **Edge secrets** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_SUPABASE_URL`, `BILLING_SUPABASE_ANON_KEY`, `BILLING_SUPABASE_SERVICE_ROLE_KEY`, `BILLING_ALLOWED_ORIGINS`; use Dashboard for `SUPABASE_*` if the platform allows it).
3. **Deploy functions:** `supabase functions deploy stripe-webhook billing-stripe --project-ref "<PROJECT_REF>"` (root workflows do this after `db push` when CI is configured).
4. In **Stripe Dashboard** (matching test/live mode), add the webhook URL:

   `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

   and paste the signing secret into **`STRIPE_WEBHOOK_SECRET`**.

5. **Stripe price sync:** GitHub Actions runs **`billing:sync-stripe`** on each staging/production deploy (after migrations). For a one-off project or if CI failed, run **`npm run billing:sync-stripe`** manually with that project’s `SUPABASE_URL` and service role key so paid plans have `stripe_price_id_*`.
6. Set app env vars (`VITE_SUPABASE_*`, and Expo `EXPO_PUBLIC_*` if using mobile) to that project’s **anon** URL and key.

---

## 9.1 PR preview billing checklist

The PR preview workflow targets the shared preview Supabase project, runs **`billing:sync-stripe`** after preparing the preview database, then deploys billing Edge Functions.

Required GitHub Actions **repository** secrets for the PR preview job (billing + link + DB scripts as wired in the workflow):

- `SUPABASE_ACCESS_TOKEN` — Supabase CLI / Management API
- `SUPABASE_PREVIEW_PROJECT_REF`, `SUPABASE_PREVIEW_DB_PASSWORD` — `supabase link` / migrations
- `SUPABASE_PREVIEW_DB_URL` — preview DB reset script (if used by your workflow path)
- `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_ANON_KEY` — web / native preview builds
- `PR_TESTING_SUPABASE_SERVICE_ROLE_KEY` — **service_role** key for the **preview** Supabase project (maps to Edge secret `BILLING_SUPABASE_SERVICE_ROLE_KEY` in CI). Add this secret in GitHub if it is missing.
- `PREVIEW_STRIPE_SECRET_KEY`, `PREVIEW_STRIPE_WEBHOOK_SECRET`, `PREVIEW_BILLING_ALLOWED_ORIGINS` — Stripe + redirect allowlist for preview

Other preview jobs may require `AWS_*`, `PR_PREVIEW_CERTIFICATE_ARN`, `EXPO_TOKEN`, Google Services secrets, etc.; see [.github/workflows/pr-preview-environment.yml](../.github/workflows/pr-preview-environment.yml).

**Webhook URL (preview):** `https://<SUPABASE_PREVIEW_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

CI runs [`scripts/ensure-stripe-webhook-endpoint.mjs`](../scripts/ensure-stripe-webhook-endpoint.mjs) (`npm run stripe:ensure-webhook`) before deploying Edge Functions: it **creates** this endpoint in Stripe if missing (using `PREVIEW_STRIPE_SECRET_KEY`) and passes the new signing secret into `supabase secrets set` in the same job. **Subsequent deploys** need **`PREVIEW_STRIPE_WEBHOOK_SECRET`** in GitHub (same value as Stripe → Webhooks → that endpoint → **Reveal**), because Stripe only returns the secret at create time. Until you add it, the ensure step fails with instructions if the endpoint already exists and the secret is missing.

You can still add or inspect the endpoint manually in Stripe Dashboard (test mode) if you prefer.

---

## 10. Customer Portal

The Customer Portal requires a **Stripe Customer** on the subscription row (`stripe_customer_id`), which Checkout creates on first successful paid checkout (or webhook path). Edge function **`billing-stripe`** action `portal` reads `billing_subscriptions` for the signed-in user and opens Stripe’s hosted portal.

In Stripe Dashboard, configure **Billing → Customer portal** (allowed products, cancellation, etc.).

**Cancel behavior:** If the customer chooses **cancel at period end**, Stripe usually keeps subscription **`status` as `active`** until the billing period ends and sets **`cancel_at_period_end: true`**. The template persists that flag on `billing_subscriptions`, and **`SubscriptionStatus`** in `@beakerstack/billing` explains that in the UI. Only **immediate** cancel (or the period actually ending) moves `status` to **`canceled`**.

---

## 11. Going live (production)

1. Switch Stripe to **Live mode**; create live **Products/Prices** (or run sync with live `sk_live_…` and production `SUPABASE_*`).
2. Register a **live** webhook endpoint pointing at **production** Supabase `stripe-webhook`; use the **live** signing secret as `STRIPE_WEBHOOK_SECRET` on the **production** project.
3. Set **live** `STRIPE_SECRET_KEY` on production Edge secrets.
4. Never mix test and live keys on one environment.
5. Turn off template-only demo flags (`billing_system_flags.demo_billing_mode`, `VITE_BILLING_DEMO_MODE`) in production unless you explicitly want simulate-upgrade RPCs.

---

## 12. Troubleshooting

| Symptom                                                       | Things to check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook **400 invalid_signature**                             | `STRIPE_WEBHOOK_SECRET` must match the **same** endpoint as the request (CLI secret vs Dashboard secret); restart `functions serve` after changing `.env.local`. If logs say **SubtleCryptoProvider / constructEvent**, the template uses **`constructEventAsync`** for Deno — redeploy or restart `functions serve` with current `stripe-webhook` code.                                                                                                                                                                                                       |
| Stripe shows correct tier but app still shows old plan        | Webhooks were not applied (often **400** on `stripe-webhook`). Fix verification (above), restart `functions serve`, then **Resend** recent events in Stripe Dashboard (Developers → Events) or complete another test checkout.                                                                                                                                                                                                                                                                                                                                 |
| Checkout finishes in Stripe but app still shows **free**      | **Preview/hosted:** In Stripe **Test mode**, **Developers → Webhooks** must list an endpoint URL exactly `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`, and GitHub secret **`PREVIEW_STRIPE_WEBHOOK_SECRET`** (Edge `STRIPE_WEBHOOK_SECRET`) must be that endpoint’s **Signing secret** — not from `stripe listen` unless webhooks go there. Check **Recent deliveries** for 4xx. In Supabase: **`billing_webhook_events`** (`processed`, `error`). The app polls subscription for ~40s after `?checkout=success` once the webhook is fixed. |
| **`customer.subscription.updated` → 500** after portal cancel | Often a thrown **`RangeError`** from `toISOString()` when Stripe omits or changes `current_period_*` / `canceled_at` timestamps. The template converts Unix fields safely; restart `functions serve` and **`stripe events resend <evt_…>`** for the failed event.                                                                                                                                                                                                                                                                                              |
| Metered usage or demo collections reset after refresh         | Ensure latest migrations are applied locally (`supabase db reset` or `supabase migration up`). Metered usage is period-based and can reset at a new billing period; demo collections/items now persist via `billing_demo_*` RPCs backed by DB.                                                                                                                                                                                                                                                                                                                 |
| Checkout returns **plan_not_checkout_ready**                  | `stripe_price_id` is null — run **`billing:sync-stripe`** or set Price IDs manually on `billing_plans`.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Webhook **200** but no row update                             | `checkout.session.completed` requires metadata `supabase_user_id`, `product_id`, `plan_id` — the template Edge checkout sets these; custom clients must do the same.                                                                                                                                                                                                                                                                                                                                                                                           |
| **401** on `billing-stripe`                                   | Call `supabase.functions.invoke` with a **logged-in** user session (Authorization header).                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Duplicate webhook deliveries                                  | Expected; handler is **idempotent** via `billing_webhook_events.stripe_event_id` unique constraint.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

---

## 13. Quick reference — URLs and commands

| Item                    | Value                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Local webhook URL       | `http://127.0.0.1:54321/functions/v1/stripe-webhook`                            |
| Hosted webhook URL      | `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`                 |
| Stripe CLI forward      | `stripe listen --forward-to <URL above>`                                        |
| Sync prices             | `npm run billing:sync-stripe` (with env vars set)                               |
| Serve functions locally | `cd supabase && supabase functions serve --no-verify-jwt --env-file .env.local` |

You now have a single path from Stripe account → secrets → webhooks → DB price IDs → app env → working Checkout and subscription updates.
