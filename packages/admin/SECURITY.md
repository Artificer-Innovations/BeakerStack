# Admin panel security

## Where admin status is stored

`public.admin_users` maps `user_id` → grant metadata. Active admins have `revoked_at IS NULL`. The table has RLS enabled with **no** policies for `anon` or `authenticated` — clients cannot read or modify it directly.

## How admin status is checked

- **Client hint:** `admin_is_admin()` RPC (via `useIsAdmin`). Used for UI only.
- **Authoritative:** Every `admin_*` RPC re-checks `admin_is_admin()` before returning data.
- **Grants/revokes:** Via CLI (`npm run admin:grant` / `admin:revoke`) **or** via the authenticated `admin_grant_operator` / `admin_revoke_operator` RPCs from the admin UI. Both paths go through `SECURITY DEFINER` functions that enforce server-side admin checks — there is no direct client access to the `admin_users` table.

### Client route guard cache

`useIsAdmin` runs `admin_is_admin()` when the session user changes (and on explicit `refresh`). If an admin grant is **revoked** while a tab stays open, the `/admin` route guard may still show the shell until remount or navigation — but **data RPCs** (`admin_list_users`, `admin_get_user`, etc.) re-check admin status and return `not_found` immediately. Treat the guard as UX; do not rely on it for security.

## Audit log

`public.admin_audit_log` is append-only from the application. Built-in RPCs log list/view actions automatically. Grant and revoke operations log `admin.operator.grant` and `admin.operator.revoke` respectively. Custom admin features should call `recordAuditEvent` or `admin_record_audit_event`.

**Audited (examples):** `admin.users.list`, `admin.users.view`, `admin.operator.grant`, `admin.operator.revoke`, plus any custom events you record.

**Not audited:** Routine non-admin app usage, failed non-admin RPC attempts (no row written), idempotent no-op revokes.

## Production responsibilities

Adopters operating an admin panel should:

- Use **dedicated operator accounts**, not day-to-day user accounts
- Protect service role keys and restrict who can run grant/revoke CLI
- Plan **audit log retention** (default: indefinite; prune manually if required)
- Review RLS and RPC changes in forks before production deploy
- Treat the admin URL as obscurity only — security is server-side enforcement
