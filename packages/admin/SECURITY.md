# Admin panel security

## Where admin status is stored

`public.admin_users` maps `user_id` → grant metadata. Active admins have `revoked_at IS NULL`. The table has RLS enabled with **no** policies for `anon` or `authenticated` — clients cannot read or modify it.

## How admin status is checked

- **Client hint:** `admin_is_admin()` RPC (via `useIsAdmin`). Used for UI only.
- **Authoritative:** Every `admin_*` RPC re-checks `admin_is_admin()` before returning data.
- **Grants/revokes:** Service role CLI only (`npm run admin:grant` / `admin:revoke`).

## Audit log

`public.admin_audit_log` is append-only from the application. Built-in RPCs log list/view actions automatically. Custom admin features should call `recordAuditEvent` or `admin_record_audit_event`.

**Audited in v1 (examples):** `admin.users.list`, `admin.users.view`, plus any custom events you record.

**Not audited:** Routine non-admin app usage, failed non-admin RPC attempts (no row written).

## Production responsibilities

Adopters operating an admin panel should:

- Use **dedicated operator accounts**, not day-to-day user accounts
- Protect service role keys and restrict who can run grant/revoke CLI
- Plan **audit log retention** (default: indefinite; prune manually if required)
- Review RLS and RPC changes in forks before production deploy
- Treat the admin URL as obscurity only — security is server-side enforcement
