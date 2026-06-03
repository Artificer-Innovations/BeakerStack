# Help & Support

Everything you need to know about {{brandName}}.

## Getting Started

1. **Sign up** at [Get started](/signup) with email or your preferred OAuth provider.
2. After confirming your email (if required), sign in and open your **Dashboard**.
3. Explore the demo dashboard to see how auth, billing gates, and feature flags work out of the box.
4. Customize `adopter/config/` and `adopter/web/` for your product branding and routes.

Need a hand? Email [{{contactEmail}}](mailto:{{contactEmail}}).

## Dashboard

The dashboard is adopter-specific code under `adopter/web/pages/DashboardPage.tsx`. It demonstrates:

- **Feature gates** tied to billing plans
- **Usage strips** and demo data patterns
- **Collections** and developer-console placeholders you can replace with real product UI

Sign in at [/login](/login) to access protected routes.

## Billing & Plans

{{brandName}} ships with Stripe billing integration:

- View your plan and usage on [Billing](/billing).
- Compare plans on [Billing → Plans](/billing/plans).
- Manage payment methods and invoices from the billing section.

Annual billing saves roughly two months on paid plans when enabled in your adopter billing config.

## Profile & Account

Update your profile from [Profile](/profile):

- Change display name and avatar
- Manage linked OAuth providers
- Sign out from all sessions

## Privacy & Data

- Read our [Privacy Policy](/privacy) for how we handle your data.
- Row-level security isolates user data in Supabase.
- Export or delete account data according to your product policy (wire in adopter-specific flows as needed).

Questions about security? Contact [{{contactEmail}}](mailto:{{contactEmail}}).

## Troubleshooting

**I cannot sign in**

- Confirm your email if signup requires verification.
- Try password reset at [/forgot-password](/forgot-password).
- Check Supabase auth settings and redirect URLs in your environment.

**Billing page shows an error**

- Ensure Stripe keys and webhook endpoints are configured for your environment.
- See setup docs in `docs/` for local and deployed billing configuration.

**Local dev issues**

- Run `npm run dev:check` to validate prerequisites.
- Run `npm run dev:start` for the full local stack.

Still stuck? Use the feedback form below or email [{{contactEmail}}](mailto:{{contactEmail}}).
