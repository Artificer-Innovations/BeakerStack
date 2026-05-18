# Supabase Edge Functions (billing)

## Functions

| Name               | JWT                                 | Purpose                                                                                                                    |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `stripe-webhook`   | **Disabled** (`verify_jwt = false`) | Stripe webhook endpoint; verifies `Stripe-Signature`; writes `billing_webhook_events` and updates `billing_subscriptions`. |
| `billing-stripe`   | **Required**                        | Authenticated checkout session, customer portal, cancel/downgrade helpers.                                                 |
| `waitlist-capture` | **Disabled**                        | Public waitlist email capture (rate-limited, uniform response).                                                            |
| `waitlist-ops`     | **Disabled**                        | Invite validate/consume; admin approve/reject/resend; log-based invite email.                                              |

## Secrets (set per Supabase project)

Configure in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or `supabase secrets set` when linked):

- `STRIPE_SECRET_KEY` — Stripe secret API key (`sk_test_…` / `sk_live_…`).
- `STRIPE_WEBHOOK_SECRET` — Signing secret from Stripe Dashboard (or from `stripe listen` for local dev).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Injected on hosted Edge when allowed; **`supabase secrets set` rejects names starting with `SUPABASE_`**, so CI sets `BILLING_SUPABASE_URL`, `BILLING_SUPABASE_ANON_KEY`, and `BILLING_SUPABASE_SERVICE_ROLE_KEY` instead (functions accept either for URL/anon/service role where implemented).
- For local `.env.local`, `SUPABASE_SERVICE_ROLE_KEY` (and optional `SUPABASE_URL`) remain the usual names.
- `BILLING_ALLOWED_ORIGINS` — Comma-separated allowed **origins** for `successUrl`, `cancelUrl`, and Customer Portal `returnUrl` (e.g. `https://app.example.com,https://staging.example.com`). Must include the web app origin (scheme + host + port) used for billing redirect links. Custom URL schemes used for native deep links are allowed if listed as a full origin (e.g. `myapp://`). For a **hosted** project, this is **required** so CORS and redirect allowlists are not empty. **Local dev:** Edge Functions see `SUPABASE_URL` as `http://kong:8000` (Docker), not `http://127.0.0.1:54321` — `billing-origins.ts` still merges common dev origins (`http://localhost:5173`, etc.) when the stack is local. Add a LAN IP origin (e.g. `http://192.168.0.12:8081`) when testing on a physical device from Expo.
- `WAITLIST_ALLOWED_ORIGINS` — Optional; defaults to merging `BILLING_ALLOWED_ORIGINS` and local dev origins for `waitlist-capture` CORS.
- **Optional:** `BILLING_WEBHOOK_TARGET` — Overrides the deploy label used in Checkout metadata (`billing_deploy_target`) and enforced by `stripe-webhook`. If unset, the value is derived from `SUPABASE_URL` / `BILLING_SUPABASE_URL`: the subdomain of `*.supabase.co` (project ref), or `local` for non-hosted URLs. Set the same override on **both** `billing-stripe` and `stripe-webhook` for a given project if the Supabase URL is not a standard `*.supabase.co` host. This label is **per Supabase project**, not per BeakerStack app name. Two BeakerStack-based apps on the **same** Supabase project sharing one Stripe account must use distinct `product_id` values in checkout metadata and seeds, not deploy-target alone.

`billing-stripe` uses the **caller’s JWT** (anon + Authorization) for `auth.getUser()` and the **service role** for trusted DB reads/writes after auth.

### Live Stripe keys

With `sk_live_…`, `success` / `cancel` / `return` URLs must not use plain `http:` (only `https:` or non-`http` schemes that you allowlisted).

## Local

```bash
supabase start
supabase functions serve --no-verify-jwt --env-file supabase/.env.local
```

Example `supabase/.env.local` (do not commit):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=...
# Optional when using hosted Supabase in .env.local; omitted for pure local stack
# BILLING_ALLOWED_ORIGINS=https://my-app.example
```

Serve `stripe-webhook` on the URL Stripe CLI forwards to (see `apps/web/docs/billing-testing.md`).

## CI

`deploy-staging.yml`, `deploy-production.yml`, and `pr-preview-environment.yml` run **`npm run billing:sync-stripe`** after database migrations (preview: after the preview DB prepare step) so `billing_plans` has `stripe_price_id_*` for checkout, then **`npm run stripe:ensure-webhook`** ([`scripts/ensure-stripe-webhook-endpoint.mjs`](../../scripts/ensure-stripe-webhook-endpoint.mjs)) so Stripe has a webhook endpoint for `…/functions/v1/stripe-webhook`, then deploy `stripe-webhook` and `billing-stripe`.

- Staging/production workflows set billing secrets from environment-scoped GitHub secrets before deploy (`STAGING_BILLING_ALLOWED_ORIGINS`, `PRODUCTION_BILLING_ALLOWED_ORIGINS`).
- PR preview workflow sets preview billing secrets on the shared preview Supabase project before deploy (`PREVIEW_BILLING_ALLOWED_ORIGINS`).

Ensure the corresponding Stripe and Supabase service-role secrets are configured in GitHub Actions.
