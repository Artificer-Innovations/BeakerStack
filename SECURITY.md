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

## Template disclaimer

Beaker Stack is a **starting point**, not a certified secure product. Before production use, review authentication, authorization (especially Row Level Security), billing webhooks, and Edge Function secrets in **your** fork. Customize policies and threat model for your product and compliance needs.

## Supported versions

Security fixes are applied on the active development branch and included in subsequent template releases and package semver bumps. Forks are responsible for merging those updates.
