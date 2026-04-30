# Code review: `billing-v1` branch vs `main`

**Review date:** 2026-04-27  
**Comparison:** `main...billing-v1` (merge-base three-dot diff)  
**Scale:** ~227 files changed, ~15k insertions / ~675 deletions

This review focuses on **security** (including accidental secret exposure), **operational risk** in CI and Edge Functions, and **overall code quality**. It is not an exhaustive line-by-line read of every new test file.

---

## Executive summary

The branch delivers a **coherent billing v1**: a `packages/billing` library, Supabase schema + RLS, two Edge Functions (`billing-stripe`, `stripe-webhook`), web and mobile UI, sync tooling, and broad test coverage. **No real Stripe or cloud Supabase secrets appear committed**; `env.example` uses placeholders, and workflow references use `secrets.*` indirection.

**Main gaps to address before production hardening:** (1) **redirect URL validation** on the checkout/portal Edge Function, (2) **information disclosure** in Stripe error responses, (3) **operational confirmation** that hosted Edge runtimes still expose `SUPABASE_ANON_KEY` to `billing-stripe` after `supabase secrets set` (4) **usage metering trust model** (client-driven RPC) if usage ever drives real charges.

---

## Security audit

### Strengths

- **Webhook integrity:** `stripe-webhook` uses `constructEventAsync` with `STRIPE_WEBHOOK_SECRET`. Invalid signatures return 400; no dependency on JWT for that function (see `supabase/config.toml`: `verify_jwt = false` for `stripe-webhook`, `true` for `billing-stripe`).
- **User-scoped billing actions:** `billing-stripe` resolves the user from the **caller's JWT** via `authClient.auth.getUser()`, then uses the **service role** only for database operations tied to that `user.id`. Mutations (checkout, portal, subscription update, cancel) are scoped to the authenticated user.
- **RLS:** `billing_subscriptions`, usage tables, and `billing_invoices` use **select-own** policies; webhook and service paths use the service role. `billing_webhook_events` has **no** authenticated policies (service role only), which is appropriate for sensitive payloads.
- **Idempotent webhook logging:** Duplicate Stripe event IDs are handled; retries can reprocess failed events (`processed = false`).
- **JWT verification:** Customer-facing Stripe operations require JWT verification on `billing-stripe`, reducing anonymous abuse.

### Findings (ordered by severity)

| Severity   | Topic                                                   | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High**   | Open redirect / phishing via Checkout & Customer Portal | `billing-stripe` passes `success_url`, `cancel_url`, and `return_url` from the **request body** into Stripe (`checkout.sessions.create`, `billingPortal.sessions.create`) with **no server-side allowlist** of origins or paths. A user with a valid session could call `functions.invoke` with attacker-controlled URLs (or a modified client could), steering post-payment redirects away from your app. **Recommendation:** Validate URLs against an allowlist (exact origins from env, e.g. `ALLOWED_CHECKOUT_ORIGINS`, or match `new URL(url).origin` to configured app origins). |
| **Medium** | Error detail leakage                                    | On catch-all errors, `billing-stripe` returns `{ error: 'stripe_error', message: msg }` where `msg` is the raw Stripe/API message. That can expose internal identifiers or operational hints. Prefer a stable client-facing code plus logged server detail only.                                                                                                                                                                                                                                                                                                                       |
| **Medium** | CORS policy                                             | `_shared/cors.ts` sets `Access-Control-Allow-Origin: *`. Supabase Edge Functions still enforce auth for `billing-stripe`; `stripe-webhook` is not browser-called. Risk is **low** for CSRF to the function (custom JSON body + user JWT), but `*` is broader than necessary if you ever expand CORS use.                                                                                                                                                                                                                                                                               |
| **Low**    | `resolvePlanId` filter construction                     | `stripe-webhook` builds a PostgREST `.or('stripe_price_id_monthly.eq.${id},...')` filter. Stripe price IDs are normally safe; if untrusted data could reach this string, it could be fragile. In practice the value comes from Stripe objects. Optional hardening: use `.or()` with separate `.eq` filters or parameterized RPC.                                                                                                                                                                                                                                                       |
| **Low**    | Webhook payload storage                                 | Full Stripe `event` objects are stored in `billing_webhook_events.payload` (PII and payment metadata). This is **correctly** not exposed to `authenticated` via RLS, but treat DB backups and admin access as **sensitive** and consider retention limits.                                                                                                                                                                                                                                                                                                                             |
| **Design** | Usage events are client-initiated                       | `billing_record_usage_event` is `SECURITY DEFINER` and callable by `authenticated` users, who can record usage for **themselves**. That is fine for “soft” limits; it is **not** a tamper-proof meter for revenue-grade billing. If overages or enforcement must be strict, move metering to trusted servers or signed server events.                                                                                                                                                                                                                                                  |

### Webhook → DB edge cases (quality / correctness, not auth bypass)

- `syncInvoiceRow` throws if no `billing_subscriptions` row exists for the Stripe customer, causing a 500 and `processed: false` on the event. That is a reasonable **retry** story but worth monitoring in production.
- `mapStripeStatus` defaults unknown Stripe statuses to `'active'`, which may be optimistic; worth revisiting as Stripe adds statuses.

---

## Secrets, keys, and sensitive data

### No evidence of committed live secrets in this branch

- **`env.example`:** Placeholders only (`sk_test_…`, `whsec_…` patterns as documentation, not real keys).
- **Edge Functions:** Read secrets from `Deno.env` only.
- **GitHub workflows:** Use `${{ secrets.* }}` for Stripe, Supabase, and AWS; no inline tokens in the diff reviewed.
- **`.github/workflows/test.yml`:** Continues to embed the **public** Supabase CLI demo JWTs for local CI against `127.0.0.1:54321` (expected for this repo’s pattern; same class of “non-secret” as `tests/utils/supabase-cli-defaults.ts`).

### Consistency check (low priority)

- `test.yml` `SUPABASE_SERVICE_ROLE_KEY` signature differs from the `LOCAL_SUPABASE_DEMO_SERVICE_ROLE_KEY` in `tests/utils/supabase-cli-defaults.ts` (third segment of the JWT). If CI ever uses helpers that require bit-identical keys, align with the **current** `supabase start` output. This predates or sits alongside the billing work; not introduced as a billing secret leak.

### Documentation and skills

- New Stripe-related **agent skills** under `.agents` / symlinks and `.claude` are **documentation and references**, not credentials.

---

## Code quality and architecture

### Positives

- **Clear separation:** `packages/billing` holds provider, hooks, and UI building blocks; apps supply `defineBillingConfig` data and route shells (`BillingProviderLayout`).
- **Schema validation:** `productBillingConfigSchema` (Zod) in the provider reduces misconfiguration.
- **SQL design:** Migrations add indexes, `SECURITY DEFINER` RPCs with `search_path` pinned, and explicit `REVOKE`/`GRANT` for RPCs. Realtime on `billing_subscriptions` is documented and scoped.
- **Tests:** Extensive unit and component tests for billing hooks, presentational components, and pages; `packages/billing` integrated into coverage upload in `test.yml`.
- **Tooling:** `scripts/sync-billing-stripe.mjs` is documented and idempotent-friendly for Stripe price linkage.

### Minor quality notes

- **Naming:** `downgrade_to_free` in `billing-stripe` implements **cancel at period end** (`cancel_at_period_end: true`), not an immediate free plan. The client hook name `scheduleCancelToFree` matches behavior better than the action name; consider renaming the action for API clarity.
- **Stripe API version:** Pinned to `2023-10-16` consistently; plan periodic upgrades per Stripe’s release notes.
- **Duplication (resolved):** Duplicate migration SQL under `apps/mobile/supabase/migrations/` was removed; canonical migrations live only under repo-root `supabase/migrations/` — developers run Supabase CLI migration workflows from the repository root (see `apps/mobile/supabase/migrations/README.md`).

---

## CI/CD and operations

- **Deploy workflows** (`deploy-staging.yml`, `deploy-production.yml`, and PR preview) now **link** the project, **set** Stripe and Supabase-related secrets, and **deploy** `stripe-webhook` and `billing-stripe`. This matches `supabase/functions/README.md`.
- **Follow-up to verify in each environment:** After first deploy, confirm `billing-stripe` logs show `SUPABASE_ANON_KEY` present (Supabase hosted projects usually inject it; the README notes “confirm if calls fail”). The workflows set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` explicitly; if `ANON` were ever missing, authenticated `getUser()` would fail.
- **PR preview** sets preview Stripe secrets on the shared preview project—ensure Stripe **test** keys and webhook endpoints are scoped to that environment.

---

## Testing and coverage

- New `packages/billing` tests and web billing page tests improve confidence.
- `supabase/tests/billing.test.sql` checks RLS and core objects; consider extending pgTAP for `billing_invoices` RLS if you want parity with `billing_subscriptions` checks.

---

## Recommended next steps (short list)

1. Add **URL allowlisting** for `successUrl`, `cancelUrl`, and `returnUrl` in `billing-stripe` (and optionally require HTTPS in production).
2. **Sanitize** client-visible errors from the Edge Function; log full errors server-side only.
3. Document or automate **Edge secret** expectations (`SUPABASE_ANON_KEY` for `billing-stripe`) in runbooks and smoke-test after deploy.
4. If usage-based billing becomes revenue-critical, **relocate usage recording** to trusted backends or verified pipelines.

---

## Conclusion

The `billing-v1` branch is a **substantial, well-structured** billing foundation with **sound RLS, webhook verification, and authenticated Edge access**. The highest-impact security improvement is **validating redirect URLs** passed into Stripe. No committed repository secrets were identified in the reviewed material; continue to keep Stripe and Supabase keys in **GitHub Actions secrets** and Supabase **Edge secrets** only.
