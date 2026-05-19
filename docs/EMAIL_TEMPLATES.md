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

Plain-text versions (`.txt` files) are provided alongside each HTML template for email clients that prefer or require plain text. **Note:** The `.txt` files in `supabase/templates/` are reference copies for human review only. Supabase derives plain-text email from the HTML template automatically — these files are not wired to Supabase via `config.toml` and do not affect sent emails.

## Quick start

### 1. Personalize templates

Run the personalization script to replace brand placeholders with your actual values:

```bash
npm run email:personalize
```

The script will prompt for:

- Product name (reads from `packages/shared/src/config/branding.ts` as default)
- Brand color (hex, reads from `packages/shared/src/theme/colors.ts` as default)
- Sender name
- Support email address
- Company address (required by CAN-SPAM)

The script is **idempotent** — re-running it restores the previous placeholders before applying new values, so you can safely update your branding at any time.

### 2. Configure SMTP (optional)

Uncomment and fill in the SMTP block in `supabase/config.toml` (see [SMTP setup](#smtp-setup-resend) below), then set `SMTP_*` vars in your `.env.local`.

### 3. Apply configuration

```bash
supabase stop && supabase start
```

### 4. Test with Inbucket

Open [http://localhost:54324](http://localhost:54324) to view emails sent during local development.

## Enabling signup confirmations

By default, `enable_confirmations = false` in `supabase/config.toml`. This means users can sign up and sign in immediately without verifying their email address.

To require email verification:

1. Open `supabase/config.toml`
2. Find the `[auth.email]` section
3. Set `enable_confirmations = true`
4. Restart Supabase: `supabase stop && supabase start`

**UX tradeoff:** Requiring confirmation reduces fake/mistyped registrations and verifies ownership, but adds friction to the signup flow. Consider your audience before enabling it.

## Customizing templates

### Editing HTML

Templates live in `supabase/templates/`. Each is a self-contained HTML file with inline CSS for maximum email client compatibility.

**Brand placeholders** (replaced by the personalization script):

| Placeholder           | Description                                  |
| --------------------- | -------------------------------------------- |
| `{{PRODUCT_NAME}}`    | Your product/app name                        |
| `{{BRAND_COLOR}}`     | Primary brand color (hex, e.g. `#6366f1`)    |
| `{{SENDER_NAME}}`     | Sender display name (e.g. "Acme Team")       |
| `{{SUPPORT_EMAIL}}`   | Support email address                        |
| `{{COMPANY_ADDRESS}}` | Physical mailing address (CAN-SPAM required) |

**Supabase Go template variables** (never modify these — Supabase substitutes them at send time):

| Variable            | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `{{ .SiteURL }}`    | Your configured site URL                                                  |
| `{{ .RedirectTo }}` | Redirect URL from the auth API call (PR preview paths, mobile deep links) |
| `{{ .TokenHash }}`  | The OTP token hash                                                        |

### Ejection marker

If you heavily customize a template and want to prevent the personalization script from overwriting your changes, add this comment anywhere in the file:

```html
<!-- beakerstack-email:customized -->
```

The script will skip any file containing this marker and log a warning.

## SMTP setup (Resend)

Resend is the recommended SMTP provider for transactional email. It offers a generous free tier and excellent deliverability.

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

- Auth: `noreply@app.yourdomain.com`
- Marketing: `hello@yourdomain.com`

This prevents deliverability issues on your marketing domain if a transactional email triggers a spam complaint, and vice versa.

## Mobile

Password reset and magic link emails link to the web `/auth/confirm` page. On mobile, these open in the device browser. Universal link support (routing directly into the app) is out of scope for v1.

## Switching SMTP providers

To switch from Resend to another SMTP provider (SendGrid, Postmark, AWS SES, etc.):

1. Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in your `.env.local`
2. Update `SMTP_ADMIN_EMAIL` and `SMTP_SENDER_NAME` if needed
3. Restart Supabase: `supabase stop && supabase start`

No template changes required — the SMTP block in `supabase/config.toml` uses `env()` substitution for all connection details.
