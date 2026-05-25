# @beakerstack/admin

Reusable **admin operator foundation** for BeakerStack: role detection, route guard, layout shell, audit helpers, and web UI primitives.

## What this package provides

- `useIsAdmin` hook and `checkIsAdmin` client helper (wraps `admin_is_admin` RPC)
- `AdminRoute` composable guard for React Router
- `AdminLayout` with declarative `navItems` configuration
- Table, search, pagination, breadcrumbs, and detail drawer primitives
- `recordAuditEvent` for custom admin features

## What it does not provide

- Pre-built Users, waitlist, or settings pages (those live in the app template)
- Mobile admin UI
- Self-serve admin promotion
- Multi-tier roles or impersonation

## Grant the first admin

Use the service-role CLI (recommended):

```bash
supabase start
npm run admin:grant -- you@example.com
```

For remote projects, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard.

See [docs/guides/admin-setup.md](../../docs/guides/admin-setup.md).

Alternatively, insert into `admin_users` with the Supabase SQL editor and service role — never expose grant APIs to authenticated clients.

## Add a new admin page

1. Add a route under `/admin/*` in your app’s `AdminApp.tsx`.
2. Add a nav item to your `adminNav.ts` config passed to `AdminLayout`.
3. Use `@beakerstack/admin/web` primitives for tables and drawers.
4. For new data access, add `SECURITY DEFINER` RPCs that call `admin_is_admin()` and audit via `_admin_insert_audit` or `admin_record_audit_event`.

## Security model

- Admin status lives in `public.admin_users` with RLS enabled and **no** client policies.
- All cross-user reads go through RPCs that verify admin server-side.
- Non-admins receive generic `not_found` responses — never “not admin”.
- `AdminRoute` is defense-in-depth only; never rely on it alone.

See [SECURITY.md](./SECURITY.md).

## Imports

- **Shared:** `@beakerstack/admin` (requires `react` — e.g. `useIsAdmin`)
- **Web components:** `@beakerstack/admin/web` (requires `react`, `react-dom`, and `react-router-dom` v6+)

Peer dependencies use semver ranges (`^18.2.0`, `^6.0.0`) so consumers are not pinned to an exact patch release.
