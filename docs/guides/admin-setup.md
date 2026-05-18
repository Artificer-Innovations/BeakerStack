# Admin panel setup

The admin panel is **web-only** and gated by the `admin_users` table. Operators manage users and usage from `/admin` after you grant them admin.

## Prerequisites

- Local or hosted Supabase with migrations applied (includes `admin_v1`)
- A signed-up user account for the operator (email/password or OAuth)

## 1. Apply migrations

```bash
supabase start   # if local
supabase migration up
```

## 2. Grant admin

From the repo root (with local Supabase running):

```bash
# Easiest: script reads `supabase status -o env` automatically
npm run admin:grant -- operator@example.com
```

Or set credentials explicitly (note: `supabase status` uses `API_URL` and `SERVICE_ROLE_KEY`):

```bash
eval "$(supabase status -o env)"
export SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

npm run admin:grant -- operator@example.com
```

Dry run:

```bash
npm run admin:grant -- operator@example.com --dry-run
```

## 3. Open the admin UI

1. Start the web app: `npm run web`
2. Sign in as the operator
3. Visit `/admin` (Dashboard) and `/admin/users`

Non-admins who open `/admin` are sent to `/not-authorized`. Unauthenticated visitors are sent to login.

## Revoke admin

```bash
npm run admin:revoke -- operator@example.com
```

## Security notes

- Never add client-side APIs to promote users to admin.
- Use dedicated operator accounts; avoid granting admin to everyday test users in production.
- Audit log rows accumulate in `admin_audit_log`; plan retention for compliance needs.

See [packages/admin/SECURITY.md](../../packages/admin/SECURITY.md) and [packages/admin/README.md](../../packages/admin/README.md).

## Extending

Add pages by updating `apps/web/src/admin/adminNav.ts` and routing in `AdminApp.tsx`. Reuse `@beakerstack/admin/web` primitives and add new `SECURITY DEFINER` RPCs for privileged data access.
