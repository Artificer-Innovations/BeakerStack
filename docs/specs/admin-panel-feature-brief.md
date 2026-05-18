# Feature Brief: Admin Panel

## Summary

A web-only administrative interface for operators of BeakerStack-based businesses. Provides authenticated, role-gated access to a dashboard where operators can view users and their usage stats. Establishes the foundational admin role, route protection, and admin layout patterns that future admin-only features (waitlist management, support tooling, configuration, etc.) will build on.

## Business need

BeakerStack adopters are operators of B2C SaaS products. Every such product eventually needs a back-office surface for the people running the business... at minimum, to see who their users are and what they're doing. Today, BeakerStack has no notion of an admin user, no role-based access beyond authenticated vs anonymous, and no admin UI scaffolding. Operators are forced to either query Supabase directly or build admin tooling from scratch, which defeats the BeakerStack promise of having table-stakes features already implemented and polished.

This brief delivers the minimum viable admin surface: a recognized admin role, a protected admin section of the web app, and a first useful page (users + usage). It is intentionally scoped narrowly so it can ship, but it is designed to be the foundation that subsequent admin features (starting with waitlist) plug into.

## Scope

### In scope

- A distinct admin role, granted out-of-band (not self-serve from within the app)
- A protected `/admin` section in the web app with its own layout shell and navigation
- A first admin page showing users with key profile and usage data
- An audit log primitive so admin actions are recorded (not surfaced in UI for v1, but populated)
- Documentation for BeakerStack adopters on how to grant the first admin

### Out of scope (v1)

- Admin panel in the mobile app — web-only by design
- Multi-tier admin roles (super-admin vs support, billing-admin, etc.) — single admin role only
- User impersonation / "log in as user" — separate feature, separate security review
- Bulk operations on users (delete, suspend, change tier en masse) — read-only v1
- Self-serve admin promotion from within the app — must happen via CLI or direct DB access
- Email/Slack/webhook notifications of admin events
- Multi-tenancy / org-scoped admin (admins are app-wide)

## Acceptance criteria

### Functional

- A user designated as an admin can navigate to `/admin` in the web app and see an admin dashboard
- A user not designated as an admin who navigates to `/admin` (or any sub-route) is redirected to a not-authorized page; the admin section reveals nothing about its existence or structure to non-admins
- An unauthenticated visitor navigating to `/admin` is redirected to the standard login flow
- The admin section has its own visual shell distinct from the user-facing app: left nav, content area, breadcrumbs, sized for desktop
- The admin shell's navigation includes at minimum: Dashboard, Users (additional entries added as later admin features ship)
- The Users page lists all users in the app with: email, display name, signup date, last active date, current billing tier, and the most relevant usage stats from the billing module's metered features
- The Users page supports pagination, search by email, and sorting by signup date and last active
- An admin clicking a user row sees a detail view with the user's full profile, full billing state, and full usage history
- All admin pages reflect the same overall visual language as the existing `/settings` shell (white surfaces, indigo accent, neutral grays, rounded cards, Lucide icons)
- BeakerStack adopters have a documented, supported path to grant the first admin (e.g., a CLI script) without needing to write SQL

### Security

- Admin status is stored in a way that cannot be modified by the user themselves through normal app APIs; a bug in client-side RLS or a missing check elsewhere must not allow a user to self-promote
- All sensitive admin operations (anything that reads or mutates data beyond what a normal user can see) execute server-side with admin status verified server-side at the point of execution, not solely at route-guard time
- The route guard is defense-in-depth, not the only check; an attacker who bypasses client routing must still be rejected by the data layer
- Admin actions that read sensitive data (e.g., viewing another user's full profile or billing state) are recorded in an audit log with: actor, action, target, timestamp, and any relevant payload
- The audit log table is append-only from the application's perspective; no admin UI can delete or modify entries in v1
- The admin role and admin actions are completely invisible to non-admin users: no leaked routes in client bundles that expose the admin surface, no API endpoints that reveal admin existence to unauthenticated callers, no error messages that distinguish "not admin" from "not found"
- Server-side checks treat absence of admin status as the default; explicit grant is required, never inferred
- Documentation explicitly warns BeakerStack adopters about the production responsibilities of running an admin panel: audit log retention, admin account hygiene, the value of dedicated admin accounts vs day-to-day user accounts

### React-like / OSS framework paradigms

- The admin foundation (role detection, route guard, layout shell, audit log primitives) ships as a reusable package separate from the app-template implementation; consumers can import it and mount admin features into it without forking
- The admin role check is exposed as an idiomatic React hook (`useIsAdmin` or similar) plus a server-side equivalent, with consistent shapes across web and any future surface
- The route guard is a composable React component, not a global side effect; consumers wrap their admin routes with it explicitly
- The admin layout shell is a component consumers can extend... they should be able to add their own admin pages to the navigation through a documented, declarative configuration, not by patching framework files
- The Users page is built from smaller composable pieces (table, search input, pagination, detail drawer) that consumers can reuse to build their own admin pages
- The audit log helpers expose a simple imperative API (`recordAuditEvent({ action, target, details })`) that consumers can call from their own admin features
- All admin components are styled and editable JSX (matching BeakerStack's template-first philosophy)... consumers can read, modify, and fork the admin UI as their app matures, rather than configuring an opaque admin library
- The package's public API is intentionally narrow: a hook, a guard, a layout, a few primitives. The Users page itself lives in the app template, demonstrating how to build admin pages, not as locked-down framework UI
- Naming conventions, file structure, and export patterns match the existing `packages/billing` module so consumers see a consistent paradigm across the framework

### Documentation

- The README for the admin package explains: what it provides, what it does not provide, how to grant the first admin, how to add a new admin page, the security model, and the audit log behavior
- The web app demonstrates a complete working admin Users page; consumers can copy and adapt rather than starting from a blank canvas
- A SECURITY.md section or equivalent explicitly addresses: where admin status is stored, how it's checked, what's audited, what's not audited, and what production responsibilities the adopter assumes

## Operating assumptions

- Admins are app-wide; there is no concept of admin-of-a-team or admin-of-an-org in v1
- Admins are humans operating the business; they are not service accounts, and there is no API key flow for admins in v1
- The number of admins per app is small (single digits typical); the system is not optimized for thousands of admin users
- Admin grants are durable until explicitly revoked; there is no concept of time-limited admin in v1

## Success signals

- A BeakerStack adopter can clone the template, grant themselves admin via the documented path, and see their users and usage in under 15 minutes
- A second admin feature (waitlist management) can be added without modifying any code in the admin package itself — only by composing the provided primitives
- A security review by an external reviewer finds no path for a non-admin user to access admin functionality or data through normal app APIs

## Open questions

These do not block the brief but need decisions before implementation:

- **First-admin grant mechanism.** CLI script, environment variable seed, one-time setup wizard, or all of the above. Recommend CLI as primary; document the others as alternatives.
- **What counts as "usage" on the Users page.** The billing module already tracks metered features per user; the Users page surfaces those. Whether to additionally surface app-specific metrics (sessions, last action, etc.) is per-adopter and should be configurable rather than hardcoded.
- **Audit log retention defaults.** Indefinite vs auto-trim. Recommend indefinite with a documented manual cleanup path; adopters with compliance needs can change.
