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

1. Serve Edge Functions:

   ```bash
   supabase functions serve --no-verify-jwt --env-file supabase/.env.local
   ```

2. Set mode to **waitlist** in admin.
3. Submit email at http://localhost:5173/signup
4. **Admin → Waitlist** → approve entry → copy invite link from drawer (also logged in function output).
5. Open invite URL → complete signup → verify dashboard + billing plan.

## Edge secrets (hosted)

| Secret                     | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `WAITLIST_ALLOWED_ORIGINS` | CORS for capture (e.g. `http://localhost:5173`) |
| `WAITLIST_INVITE_SUBJECT`  | Optional invite email subject                   |
| `WAITLIST_INVITE_HTML`     | Optional HTML template with `{{inviteUrl}}`     |

Uses the same Supabase service role / URL vars as billing Edge Functions.

## Mode changes

Flipping from waitlist → open does **not** auto-convert entries. Pending rows stay pending until approved or rejected.
