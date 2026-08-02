# Security Policy

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Report privately to:

- **Email:** [security@artificerinnovations.com](mailto:security@artificerinnovations.com)
- **GitHub:** [Private vulnerability reporting](https://github.com/Artificer-Innovations/BeakerStack/security/advisories/new)

Include a description, steps to reproduce, and impact. We aim to acknowledge reports within a few business days.

## Scope

**In scope**

- Source code in this repository (template apps, `packages/*`, `supabase/` migrations and Edge Functions)
- Published `@beakerstack/*` npm packages maintained from this repo
- RLS policies, auth flows, and billing patterns shipped as part of the template

**Out of scope**

- Deployments and infrastructure you operate in your own AWS, Supabase, or Stripe accounts
- Secrets, API keys, or environment configuration you add in forks
- Vulnerabilities in third-party services (Supabase, Stripe, Expo, etc.) — report those vendors directly
- Downstream applications built from forks unless they are clearly attributable to template code as shipped here

## Admin panel

BeakerStack ships an operator admin surface (`/admin` on web only). See [packages/admin/SECURITY.md](packages/admin/SECURITY.md) for:

- Where admin status is stored (`admin_users`) and how grants work (service-role CLI only)
- Server-side RPC enforcement and audit logging
- Production responsibilities (dedicated operator accounts, audit retention, service role hygiene)

Non-admins must not be able to read admin tables or invoke admin RPCs successfully; route guards are not sufficient on their own.

## Template disclaimer

Beaker Stack is a **starting point**, not a certified secure product. Before production use, review authentication, authorization (especially Row Level Security), billing webhooks, admin grants, and Edge Function secrets in **your** fork. Customize policies and threat model for your product and compliance needs.

## Supported versions

Security fixes are applied on the active development branch and included in subsequent template releases and package semver bumps. Forks are responsible for merging those updates.

## Dependency security

- **Lockfile is authoritative.** Install with `npm ci` (CI already does). Commit `package-lock.json` for every dependency change; do not regenerate it casually on a dirty tree.
- **Pin known-good versions for advisories.** Prefer root `overrides` with exact versions (or tight ranges) so transitive CVE fixes stay explicit. Avoid leaving “audit-zero” pins as floating caret ranges in bare `devDependencies` without a matching override.
- **Direct deps only when npm needs them.** Some overrides (e.g. `form-data`) omit transitive children unless they are also declared at the root — keep those pinned exactly and mirrored in `overrides`.
- **Gate on audit.** CI runs `npm audit`; keep the tree at zero vulnerabilities (or document a time-boxed exception in the PR).
