# Follow-up code review: billing fixes (post `code-review-billing-v1`)

**Review date:** 2026-04-27  
**Purpose:** Verify that the codebase changes address the concerns listed in [code-review-billing-v1.md](./code-review-billing-v1.md).

---

## Summary

| Original concern                                                                | Status                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High — open redirect** (unvalidated `successUrl` / `cancelUrl` / `returnUrl`) | **Resolved**              | `assertRedirectUrlAllowed()` in [`supabase/functions/_shared/billing-origins.ts`](../../supabase/functions/_shared/billing-origins.ts) validates `new URL(...).origin` against a allowlist before Stripe calls. Called from checkout and portal handlers in [`billing-stripe/index.ts`](../../supabase/functions/billing-stripe/index.ts).                                                                                   |
| **Medium — error detail leakage**                                               | **Resolved**              | Catch-all path returns only `{ error: 'stripe_error' }` (no raw `message` to the client). `RedirectValidationError` maps to `invalid_redirect_url`. Full errors are logged with `console.error`.                                                                                                                                                                                                                             |
| **Medium — CORS `*`**                                                           | **Resolved**              | [`supabase/functions/_shared/cors.ts`](../../supabase/functions/_shared/cors.ts) uses `corsHeadersForRequest(req)`: reflects `Origin` when it is in the same allowlist; no `*` for browser requests with a matching origin; `*` only when `Origin` header is absent (typical for non-browser callers).                                                                                                                       |
| **Operational — `SUPABASE_ANON_KEY` for `billing-stripe`**                      | **Partially addressed**   | The function still **requires** `SUPABASE_ANON_KEY` in env (explicit check at lines 36–41 of `billing-stripe/index.ts`). Deploy workflows do **not** pass it through `supabase secrets set`; that continues to rely on **Supabase-managed** Edge runtime defaults, which is the usual pattern. No code change required if the platform always injects the anon key; consider a one-line smoke test in runbooks after deploy. |
| **Naming — `downgrade_to_free` vs behavior**                                    | **Resolved**              | Action renamed to `schedule_cancel_to_free` in the Edge contract; [`useBillingStripeActions.ts`](../../packages/billing/src/hooks/useBillingStripeActions.ts) sends `schedule_cancel_to_free`.                                                                                                                                                                                                                               |
| **Design — client-trusted usage metering**                                      | **Unchanged (by design)** | Still appropriate for soft limits; not a regression.                                                                                                                                                                                                                                                                                                                                                                         |
| **Low — `resolvePlanId` PostgREST filter**                                      | **Unchanged**             | Still acceptable given Stripe-sourced price IDs.                                                                                                                                                                                                                                                                                                                                                                             |
| **Low — webhook payload retention / backups**                                   | **Unchanged**             | Operational/policy concern only.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Consistency — demo JWT in CI vs `supabase-cli-defaults`**                     | **Unchanged**             | Low priority; not part of the billing fix wave.                                                                                                                                                                                                                                                                                                                                                                              |

---

## What was verified in code

### Redirect allowlist

- **`BILLING_ALLOWED_ORIGINS`** — comma-separated origins merged in `getBillingAllowedOrigins()` (documented in [`env.example`](../../env.example), [`supabase/functions/README.md`](../../supabase/functions/README.md)).
- **Local dev** — When `SUPABASE_URL` is loopback (`localhost`, `127.0.0.1`, or `[::1]`), common dev origins (Vite `5173`, Expo `8081`, `:3000`, including `http://[::1]:…`) are merged automatically so teams are not blocked without secrets.
- **Live Stripe keys** — If `STRIPE_SECRET_KEY` starts with `sk_live_`, `http:` redirect URLs are rejected (HTTPS-only for live).

### CI/CD alignment

- **`deploy-staging.yml`**, **`deploy-production.yml`**, and **`pr-preview-environment.yml`** pass **`PREVIEW_/STAGING_/PRODUCTION_BILLING_ALLOWED_ORIGINS`** into `supabase secrets set` as **`BILLING_ALLOWED_ORIGINS`**, alongside Stripe and Supabase URL/service-role secrets.

### Tests / hooks

- **`packages/billing`** tests expect `action: 'schedule_cancel_to_free'` in `useBillingStripeActions.test.tsx` (per repository grep).

### Webhook function

- **`stripe-webhook`** uses the same `corsHeadersForRequest` / `jsonResponse(..., req)` pattern; no raw error message in client JSON for processing failures (unchanged security posture for the main path).

---

## Remaining small gaps (non-blocking)

1. **Custom URL schemes (mobile)** — README mentions listing origins such as `myapp://`. Behavior depends on how `new URL(...)` parses the redirect string you pass from the client and whether `url.origin` matches what you put in `BILLING_ALLOWED_ORIGINS`. Worth one manual test per platform (Expo deep link) before go-live.

Setup manifest sync for billing origins (`PREVIEW_/STAGING_/PRODUCTION_BILLING_ALLOWED_ORIGINS`) and IPv6 loopback dev URLs (`http://[::1]:…`) were added after this doc’s initial draft — see [`scripts/lib/setup-manifest.mjs`](../../scripts/lib/setup-manifest.mjs) and [`billing-origins.ts`](../../supabase/functions/_shared/billing-origins.ts).

---

## Conclusion

The **security-critical** items from the prior review (**redirect validation**, **sanitized errors**, **tighter CORS**) are **implemented coherently** and wired through CI secrets for hosted environments. The **API naming** concern for cancel-at-period-end is **fixed**. Optional **deep-link verification** per platform and **by-design** usage metering remain on the backlog—not regressions from the fixes.
