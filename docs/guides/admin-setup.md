# Admin panel setup

The admin panel is **web-only** and gated by the `admin_users` table. Operators manage users and usage from `/admin` after you grant them admin.

## Prerequisites

- Local or hosted Supabase with migrations applied (includes `admin_v1` and `admin_v2_promote_demote`)
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

# Optional: record which auth user ran the grant (populates admin_users.granted_by)
npm run admin:grant -- operator@example.com --granted-by you@example.com
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

## Promoting and demoting operators via the UI

Once you have at least one operator, additional grants and revocations can be done from the **Users** page in the admin panel without touching the CLI.

### Grant access

1. Open `/admin/users`
2. Click any user row to open the detail drawer
3. In the **Operator access** section, click **Grant admin access**
4. Confirm in the dialog — the change takes effect immediately

### Revoke access

1. Open the target user's detail drawer
2. Click **Revoke admin access** and confirm
3. The operator loses access on their next data request (route guard may lag until navigation — see [SECURITY.md](../../packages/admin/SECURITY.md))

### Self-demotion is blocked

You cannot revoke your own admin access from the UI. Use the CLI `npm run admin:revoke` if a self-demotion is intentional.

## Security notes

- Grants and revocations via the UI go through `SECURITY DEFINER` RPCs (`admin_grant_operator` / `admin_revoke_operator`) that re-check admin status server-side on every call.
- Never add direct client write access to the `admin_users` table.
- Use dedicated operator accounts; avoid granting admin to everyday test users in production.
- Audit log rows accumulate in `admin_audit_log`; plan retention for compliance needs.

See [packages/admin/SECURITY.md](../../packages/admin/SECURITY.md) and [packages/admin/README.md](../../packages/admin/README.md).

## Extending

Add pages by updating `apps/web/src/admin/adminNav.ts` and routing in `AdminApp.tsx`. Reuse `@beakerstack/admin/web` primitives and add new `SECURITY DEFINER` RPCs for privileged data access.
