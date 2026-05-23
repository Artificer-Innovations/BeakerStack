# Waitlist setup guide

## Prerequisites

- Local Supabase: `supabase start`
- Migrations applied (includes `waitlist_v1`)
- Admin granted: `npm run admin:grant -- you@example.com`

## Configure signup mode

1. Sign in as admin → **Admin → Waitlist settings**.
2. Choose mode: `open`, `waitlist`, `invite_only`, or `closed`.
3. Set **starting plan** for converted users (default `beakerstack_free`).
4. Adjust confirmation / closed / invite-only copy as needed.

## Test the flow (local)

1. Ensure Edge Functions are reachable. After `supabase start`, check status — if
   `supabase_edge_runtime` is stopped or capture returns **503**, run:

   ```bash
   npm run dev:waitlist-functions
   ```

   Or serve all functions:

   ```bash
   supabase functions serve --no-verify-jwt --env-file supabase/.env.local
   ```

   Quick check (should return `{"ok":true,...}`, not 503):

   ```bash
   curl -s -X POST http://127.0.0.1:54321/functions/v1/waitlist-capture \
     -H "Content-Type: application/json" \
     -d '{"email":"probe@example.com"}'
   ```

   If you still get **503** / `name resolution failed`, restart Kong:
   `docker restart supabase_kong_$(basename "$PWD")` (container suffix matches your project folder name).

2. Set mode to **waitlist** in admin.
3. Submit email at http://localhost:5173/signup
4. **Admin → Waitlist** → approve entry → copy invite link from drawer. Without `WAITLIST_RESEND_API_KEY`, email send returns `email_not_configured` and the UI prompts you to copy the link.
5. Open invite URL → complete signup → verify dashboard + billing plan.

## Edge secrets (hosted)

| Secret                     | Purpose                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `WAITLIST_ALLOWED_ORIGINS` | CORS for capture (e.g. `http://localhost:5173`)                                                                         |
| `WAITLIST_INVITE_SUBJECT`  | Optional invite email subject                                                                                           |
| `WAITLIST_INVITE_HTML`     | Optional HTML template with `{{inviteUrl}}`                                                                             |
| `WAITLIST_RESEND_API_KEY`  | Resend API key. Without it, send returns `501 email_not_configured` and logs metadata only (safe default for dev/test). |
| `WAITLIST_INVITE_FROM`     | Resend `from` address (default: `onboarding@resend.dev`)                                                                |

Uses the same Supabase service role / URL vars as billing Edge Functions.

> **Note:** Waitlist invite email (`waitlist-ops`) and auth transactional email (Supabase SMTP) are **entirely separate delivery paths** with separate configuration. `WAITLIST_RESEND_API_KEY` only affects invite emails; auth emails use `SMTP_*` vars. See [docs/EMAIL_TEMPLATES.md](../EMAIL_TEMPLATES.md) for auth email setup.

## Mode changes

Flipping from waitlist → open does **not** auto-convert entries. Pending rows stay pending until approved or rejected.
