# Email Templates

BeakerStack ships five ready-to-use transactional email templates that integrate directly with Supabase Auth. Each template is styled, CAN-SPAM compliant, and customizable through a single personalization script.

## Overview

| Template            | File                       | Supabase Type  | Trigger                  |
| ------------------- | -------------------------- | -------------- | ------------------------ |
| Signup confirmation | `signup_confirmation.html` | `signup`       | New user registration    |
| Password reset      | `password_reset.html`      | `recovery`     | Forgot password flow     |
| Magic link          | `magic_link.html`          | `magiclink`    | Passwordless sign-in     |
| Email change        | `email_change.html`        | `email_change` | User updates their email |
| Invite              | `invite.html`              | `invite`       | Admin invites a user     |

All templates use the **token-hash strategy** — links resolve to `/auth/confirm?token_hash=...&type=...`, which calls `supabase.auth.verifyOtp()` and then redirects to the right page. This is the recommended Supabase PKCE-compatible approach.

Links prefer `{{ .RedirectTo }}` (from `resetPasswordForEmail`, `signUp` `emailRedirectTo`, etc.) and fall back to `{{ .SiteURL }}/auth/confirm` when no redirect is passed. On PR preview deploys, the web app passes `https://deploy.example.com/pr-N/auth/confirm` so email links stay on the preview path instead of the root Site URL.

Plain-text versions (`.txt` files) are provided alongside each HTML template for email clients that prefer or require plain text. **Note:** The `.txt` files are reference copies for human review only. Supabase derives plain-text email from the HTML template automatically — these files are not wired to Supabase via `config.toml` and do not affect sent emails.

## Template layout (pure source vs generated deploy)

BeakerStack separates **adopter source templates** from **deploy artifacts**:

| Path                                       | Purpose                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `supabase/templates/*.html` and `*.txt`    | **Pure source** — placeholders only (`{{PRODUCT_NAME}}`, etc.). Never commit literal product names here.                  |
| `supabase/templates/generated/`            | **Deploy output** — personalized HTML and `.txt` copies that Supabase and CI use. Commit these after running personalize. |
| `supabase/templates/.personalization.json` | Branding record used by `npm run email:personalize` (and CI `--non-interactive`).                                         |

`supabase/config.toml` points `content_path` at `supabase/templates/generated/*.html`. Email **subjects** use readable `__PRODUCT_NAME__` tokens in the committed config (for example, `Confirm your __PRODUCT_NAME__ account`). The personalize script never edits `config.toml`; deploy sync and optional local materialization substitute tokens from `.personalization.json`.

Deploy workflows regenerate `generated/` before `scripts/sync-supabase-auth-config.sh`, which materializes subjects into a temporary config copy for `supabase config push` and restores the tokenized file afterward. CI also fails PRs when `generated/` is stale relative to the pure templates and branding config.

## Quick start

### 1. Generate logo asset

The default logo URL is `{{ .SiteURL }}/email-logo.png`. Regenerate the PNG from your favicon source:

```bash
npm run generate:favicons
```

This writes `apps/web/public/email-logo.png`, served at `/email-logo.png` on your site.

### 2. Personalize templates

Run the personalization script to read pure placeholders from `supabase/templates/` and write deploy artifacts to `supabase/templates/generated/` (support email defaults to `support@<apex>` from `PR_PREVIEW_DOMAIN` or branding):

```bash
npm run email:personalize
```

For CI or scripted runs:

```bash
npm run email:personalize -- --non-interactive
```

**Commit `supabase/templates/generated/`** (not the pure `supabase/templates/*.html` files). Re-running personalize is safe — it rebuilds `generated/` from the pure source without mutating placeholders.

The script will prompt for (or read from `.personalization.json` when non-interactive):

- Product name (reads from `packages/shared/src/config/branding.ts` as default)
- Brand color (hex, reads from `packages/shared/src/theme/colors.ts` as default)
- Sender name
- Support email address
- Company address (required by CAN-SPAM — set `LEGAL_CONFIG.mailingAddress` in `packages/shared/src/config/legal.ts`; `legalEntityName` alone is not a valid physical address)

**Logo CDN override:** set `LOGO_URL` in `supabase/templates/.personalization.json`, or pass `--logo-url=https://cdn.example.com/logo.png`. The value persists across runs unless overridden by the flag.

**PR preview:** the shared preview Supabase project uses one auth email config for all open PRs. The preview deploy workflow passes `--logo-url=https://deploy.<domain>/pr-N/email-logo.png` so the logo resolves on the path-based preview URL (not `https://deploy.<domain>/email-logo.png`). Each preview deploy overwrites the hosted config; the most recently deployed PR’s logo URL wins, which is acceptable because the asset rarely changes.

**Subject lines:** for local Supabase, run `npm run email:materialize-config` after personalize to substitute `__PRODUCT_NAME__` in your working copy of `config.toml`, then `supabase stop && supabase start`. Do not commit materialized subjects — run `git restore supabase/config.toml` to restore tokens. Hosted deploys materialize automatically during config push.

### 3. Configure SMTP

`[auth.email.smtp]` in `supabase/config.toml` is enabled and reads `SMTP_*` from the environment (see [SMTP setup](#smtp-setup-resend)). Set those vars in `.env.local` for local Supabase, or run `npm run setup:email` to provision Resend + Route 53 and merge values automatically.

### 4. Materialize config subjects (local only)

```bash
npm run email:materialize-config
```

Substitutes `__PRODUCT_NAME__` in `supabase/config.toml` from `.personalization.json` for local Supabase. The committed file keeps tokens; restore with `git restore supabase/config.toml` if needed.

### 5. Apply configuration

```bash
supabase stop && supabase start
```

### 6. Test with Inbucket

Open [http://localhost:54324](http://localhost:54324) to view emails sent during local development.

## Signup email confirmation

`enable_confirmations = true` under `[auth.email]` in `supabase/config.toml` is the template default. New email/password signups receive the signup confirmation template and must verify before signing in.

| Context      | Behavior                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hosted**   | Confirmation + SMTP apply together when deploy workflows run `scripts/sync-supabase-auth-config.sh` (requires `RESEND_SMTP_PASS`). Until that secret exists, config push is skipped and the Supabase project keeps its dashboard settings.                                                 |
| **Local**    | Run `npm run setup:email` to merge `SMTP_*` into `.env.local`, then `supabase stop && supabase start`. Without SMTP, confirmation emails do not send and users cannot finish signup — configure mail first, or temporarily set `enable_confirmations = false` for auth-only local testing. |
| **Inbucket** | After SMTP is configured locally, open [http://localhost:54324](http://localhost:54324) to read signup confirmation messages.                                                                                                                                                              |

`npm run setup:email` also ensures `enable_confirmations = true` when it updates `config.toml` (idempotent).

To disable verification (not recommended for production demos): set `enable_confirmations = false` under `[auth.email]` and restart Supabase.

## Customizing templates

### Editing HTML

Pure templates live in `supabase/templates/`. Deployed copies are written to `supabase/templates/generated/`. Each HTML file is self-contained with inline CSS for maximum email client compatibility.

Edit the **pure** templates when changing layout or copy structure, then re-run `npm run email:personalize` and commit `generated/`.

**Brand placeholders** (replaced by the personalization script):

| Placeholder           | Description                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `{{PRODUCT_NAME}}`    | Your product/app name                                                                                        |
| `{{BRAND_COLOR}}`     | Primary brand color (hex, e.g. `#6366f1`)                                                                    |
| `{{SENDER_NAME}}`     | Sender display name (e.g. "Acme Team")                                                                       |
| `{{SUPPORT_EMAIL}}`   | Support email address                                                                                        |
| `{{COMPANY_ADDRESS}}` | Physical mailing address (CAN-SPAM required)                                                                 |
| `{{LOGO_URL}}`        | Absolute URL to the product logo PNG (defaults to `{{ .SiteURL }}/email-logo.png`; override for CDN hosting) |

**Supabase Go template variables** (never modify these — Supabase substitutes them at send time):

| Variable            | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `{{ .SiteURL }}`    | Your configured site URL                                                  |
| `{{ .RedirectTo }}` | Redirect URL from the auth API call (PR preview paths, mobile deep links) |
| `{{ .TokenHash }}`  | The OTP token hash                                                        |

## SMTP setup (Resend)

Resend is the recommended SMTP provider for transactional email. It offers a generous free tier and excellent deliverability.

### Resend API keys (two roles)

| Role          | When                                                 | Permissions                              | Stored where                                                                                                |
| ------------- | ---------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Setup**     | `npm run setup:email` / `setup:full` email-dns phase | **Full access** (domains, DNS, send)     | `RESEND_API_KEY` in `.env.local` only — **not** GitHub                                                      |
| **SMTP + CI** | Local Supabase + deploy workflows                    | **Send email** (send-only key is enough) | `SMTP_PASS` in `.env.local`; `RESEND_SMTP_PASS` on GitHub (one secret for preview, staging, and production) |

`setup:email` prompts for the full-access key first, then (recommended) a separate send-only key for SMTP and GitHub. CI does **not** need full access — only the ability to send via `smtp.resend.com`.

### Step-by-step

1. **Create a Resend account** at [resend.com](https://resend.com)

2. **Add and verify your domain** in the Resend dashboard (Domains → Add Domain)

3. **Add DNS records** — Resend will give you SPF, DKIM, and DMARC records to add to your DNS provider:

   | Record type | Host                | Value                                                     |
   | ----------- | ------------------- | --------------------------------------------------------- |
   | TXT         | `@` or subdomain    | SPF record (`v=spf1 include:amazonses.com ~all`)          |
   | TXT         | `resend._domainkey` | DKIM public key                                           |
   | TXT         | `_dmarc`            | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` |

4. **Wait for verification** — usually a few minutes; can take up to 48 hours for DNS propagation

5. **Get an API key** — API Keys → Create API Key. Copy the key (shown once)

6. **Set environment variables** in `.env.local`:

   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_xxxxxxxxxxxx       # Your Resend API key
   SMTP_ADMIN_EMAIL=you@yourdomain.com
   SMTP_SENDER_NAME=Your App Team
   ```

7. **Uncomment the SMTP block** in `supabase/config.toml`:

   ```toml
   [auth.email.smtp]
   enabled = true
   host = "env(SMTP_HOST)"
   port = 587
   user = "env(SMTP_USER)"
   pass = "env(SMTP_PASS)"
   admin_email = "env(SMTP_ADMIN_EMAIL)"
   sender_name = "env(SMTP_SENDER_NAME)"
   ```

8. **Restart Supabase**: `supabase stop && supabase start`

## Domain verification

Proper domain authentication is critical for deliverability and protects your brand from email spoofing.

**SPF** (Sender Policy Framework) — declares which mail servers are authorized to send email from your domain. Add a TXT record to your DNS.

**DKIM** (DomainKeys Identified Mail) — cryptographically signs outgoing email so recipients can verify it hasn't been tampered with. Add the DKIM TXT record that Resend provides.

**DMARC** (Domain-based Message Authentication, Reporting & Conformance) — tells receiving servers what to do when SPF or DKIM fails. Start with `p=none` for monitoring, then move to `p=quarantine` once you've confirmed legitimate mail is passing.

Recommended DMARC policy for production:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100
```

## Auth vs marketing email separation

Transactional auth emails (this feature) and marketing/promotional emails should use **separate sending domains** or subdomains. For example:

- Auth: `notifications@app.yourdomain.com` (avoid `noreply@` — poor deliverability per Resend)
- Marketing: `hello@yourdomain.com`

This prevents deliverability issues on your marketing domain if a transactional email triggers a spam complaint, and vice versa.

## Mobile

Password reset and magic link emails link to the web `/auth/confirm` page. On mobile, these open in the device browser. Universal link support (routing directly into the app) is out of scope for v1.

## Hosted environments (CI/CD)

Deploy workflows **optionally** push auth email settings after `supabase db push`. Before sync, workflows run `npm run email:personalize -- --non-interactive` so `generated/` and subject tokens reflect the latest branding and legal config. The sync step runs **only when** `RESEND_SMTP_PASS` **and** `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` are set (typically after `npm run setup:full` google + github phases). If either gate is missing, deploys skip config push and keep existing Supabase dashboard settings.

| Environment | Workflow                     | `SUPABASE_AUTH_SITE_URL` (derived)                       |
| ----------- | ---------------------------- | -------------------------------------------------------- |
| PR preview  | `pr-preview-environment.yml` | `https://deploy.{PR_PREVIEW_DOMAIN}` (+ per-PR redirect) |
| Staging     | `deploy-staging.yml`         | `https://staging.{PR_PREVIEW_DOMAIN}`                    |
| Production  | `deploy-production.yml`      | `https://{PR_PREVIEW_DOMAIN}` (apex)                     |

Site URLs use the same `PR_PREVIEW_DOMAIN` repository variable as web deploy (`deploy-web.sh` / deploy workflows). No sync runs for forks that skip `setup:email`.

The script runs `supabase link` + `supabase config push`, applying `site_url`, redirect allow-list, HTML templates from `supabase/templates/generated/`, subjects, `enable_confirmations`, SMTP, and **Google OAuth** from `supabase/config.toml`. Unset Google env vars during push would wipe hosted OAuth — the script and workflows refuse to run without them.

PR CI (`test.yml`) regenerates templates and fails if `supabase/templates/generated/` is out of date vs the pure source and `.personalization.json`.

**GitHub configuration** (after `npm run setup:full` or manual setup):

| Kind     | Name                                      | Purpose                                                                                      |
| -------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Secret   | `RESEND_SMTP_PASS`                        | **Gate +** send-only Resend API key (SMTP password) for all environments — unset = skip sync |
| Secret   | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | **Gate +** Google OAuth web client ID for config push (setup wizard **google** phase)        |
| Secret   | `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | **Gate +** Google OAuth client secret for config push                                        |
| Variable | `PR_PREVIEW_DOMAIN`                       | Apex domain (e.g. `beakerstack.com`) — used to build auth site URLs                          |
| Variable | `SMTP_ADMIN_EMAIL`                        | From address (verified in Resend)                                                            |
| Variable | `SMTP_SENDER_NAME`                        | Display name                                                                                 |

Workflows set `SMTP_HOST=smtp.resend.com`, `SMTP_USER=resend`, port `587`. Preview deploys also set `SUPABASE_ADDITIONAL_REDIRECT_URL` to `https://deploy.<domain>/pr-N/auth/confirm`.

Names are listed in [reference/github-actions-secrets.md](reference/github-actions-secrets.md). The setup wizard can sync SMTP secrets/variables during the **github** phase when values exist in `.env.local`.

**Forks:** Set `PR_PREVIEW_DOMAIN`, edit branding in `packages/shared/src/config/` and `.personalization.json`, run `npm run email:personalize`, commit `supabase/templates/generated/`, run `setup:email`, then sync secrets. Until `RESEND_SMTP_PASS` exists, deploys skip email config push entirely.

## Switching SMTP providers

To switch from Resend to another SMTP provider (SendGrid, Postmark, AWS SES, etc.):

1. Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in your `.env.local`
2. Update `SMTP_ADMIN_EMAIL` and `SMTP_SENDER_NAME` if needed
3. Restart Supabase locally: `supabase stop && supabase start`
4. Update `RESEND_SMTP_PASS` and SMTP variables on GitHub

No template changes required — the SMTP block in `supabase/config.toml` uses `env()` substitution for all connection details.
