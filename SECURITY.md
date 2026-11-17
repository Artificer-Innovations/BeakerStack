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
- **Gate on audit.** CI runs `npm audit` through [`scripts/ci/npm-audit-allowlist.mjs`](scripts/ci/npm-audit-allowlist.mjs). Keep the tree at zero vulnerabilities. The only exceptions are the time-boxed entries in that script's `ALLOWLIST`, each matched by GHSA id and package and listed under [Audit exceptions](#audit-exceptions) below. The gate fails on any other advisory, on an expired entry, and on audit output it can't attribute. Run it locally with `node scripts/ci/npm-audit-allowlist.mjs`. The gate fails closed: if `npm audit` cannot run, is killed, exits unexpectedly, prints nothing or returns a report it cannot read, CI fails.
- **`image-size` is vendored.** Metro 0.84 still needs the 1.x CJS API for asset dimensions, and upstream never published a patched npm release (advisories list `>=2.0.3`, registry latest is `2.0.2`). Root `overrides` map `image-size` to [`vendor/image-size`](vendor/image-size) (`@beakerstack/image-size`), which is official `1.2.1` plus in-repo ICNS/`findBox` loop guards. Do not replace this with a third-party npm fork. TODO: drop the vendor when upstream publishes a usable patched release — [#419](https://github.com/Artificer-Innovations/BeakerStack/issues/419).

### Audit exceptions

| Package                    | Advisory                                                                 | Severity | Expires    | Why it's allowed |
| -------------------------- | ------------------------------------------------------------------------ | -------- | ---------- | ---------------- |
| `picomatch` (2.3.2, 4.0.x) | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | high     | 2027-02-17 | Explained below. |

**picomatch, GHSA-fc5q-39xc-vjpf.** This is a ReDoS bug. A glob with a repeated single-option group, such as `+(*)` or `+(*a)`, compiles to a regex that backtracks exponentially and blocks the event loop. It affects every release through 4.0.7, and upstream has no fix yet. To exploit it, an attacker has to control the glob pattern itself, not just the strings being matched. None of our code imports picomatch or any other glob library. Every pattern it sees comes from repo-owned config: Jest, Vitest, Vite, Metro, Tailwind and lint-staged. None of those patterns has the vulnerable shape. The closest, `?(*.)+(spec|test).ts`, has two options in its repeated group. picomatch is only used by build, test and dev tools, and it doesn't ship in the web or mobile apps.

We can't remove it, because it sits under nearly the whole toolchain. Patching it with patch-package wouldn't change the version `npm audit` reports. Vendoring two forked versions, as we did for `image-size`, is more than this risk justifies. **Exit:** once upstream publishes a fixed release, pin it in root `overrides`, then remove this row and the `ALLOWLIST` entry.
