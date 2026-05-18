# Feature Brief: Waitlist Support

## Summary

A configurable signup-gating capability that lets BeakerStack-based businesses operate in any of several signup modes (open, waitlist, invite-only, closed), collect prospective users when the app is not openly accepting signups, and convert collected entries into full users when the operator is ready. Includes the public-facing waitlist signup experience and the admin-side management of waitlist entries. Depends on the admin panel feature for the management surface.

## Business need

BeakerStack adopters launching new products almost always need a way to gate signups before, during, and sometimes after launch. Common reasons: validating demand before the product is built ("painted door" launches), controlling load during early beta, running closed invite-only periods, and pausing signups during incidents or wind-downs. Without first-class support, every adopter rebuilds this capability themselves, usually badly: hand-rolled forms posting to ad-hoc tables, no admin workflow, no email delivery, no link back into the actual signup flow. The cost of getting this wrong includes lost leads, leaked emails, broken trust, and weeks of founder time.

This brief delivers a complete, opinionated waitlist capability: a configurable signup mode, a public-facing form that adapts to the current mode, a server-side capture pipeline with reasonable abuse protection, an admin workflow to approve and convert entries, and a clean handoff into the existing authentication and billing flows.

## Scope

### In scope

- A single source of truth for the current signup mode of the app, with at least these modes: open, waitlist, invite-only, closed
- A public-facing signup component that adapts its UI and behavior to the current mode
- A waitlist entry capture pipeline (form submission to server-side storage) with basic abuse protection (rate limiting, duplicate email handling, optional simple bot mitigation)
- An admin page for viewing, searching, filtering, approving, and rejecting waitlist entries
- An approval flow that issues a time-bounded invite, sends a transactional email, and allows the recipient to complete signup
- A signup completion flow that consumes the invite, creates the auth user, and provisions them at a configurable starting billing tier
- Existing authenticated users can always log in regardless of signup mode; the mode affects new signups only
- Configurable copy for each mode (e.g., the message shown on the closed-signup screen) so adopters do not have to fork components for tone changes

### Out of scope (v1)

- Public-facing waitlist counter or social proof ("3,247 people waiting") — easy to add later, avoid the credibility risks now
- Referral chains, invite quotas, "skip the line" mechanics
- Multi-cohort waitlists with separate approval streams
- Geographic or other rule-based auto-approval
- Importing existing waitlist data from third-party tools — adopters can do this via direct DB access if needed
- A/B testing of waitlist copy or form variants
- SMS-based waitlist signup
- Integration with marketing automation tools (ConvertKit, Mailchimp, etc.) — server-side webhooks may be added later

## Acceptance criteria

### Functional

- An operator can set the app's signup mode to one of: open, waitlist, invite-only, closed
- When mode is "open," the signup form behaves exactly as today: new users sign up directly
- When mode is "waitlist," the public signup form is replaced with a waitlist form that collects email and optional metadata; submitters see a confirmation that they have been added
- When mode is "invite-only," the public signup form is replaced with a message that signup requires an invite; the waitlist form is not shown
- When mode is "closed," the public signup form is replaced with operator-configurable copy explaining the state; no email is collected
- Regardless of mode, existing users can always log in through the normal login flow
- Regardless of mode, a user holding a valid, unexpired invite can complete signup at a dedicated route that accepts the invite token
- Submitting the same email to the waitlist twice does not create a duplicate entry and does not reveal to the submitter whether the email was already present
- An admin viewing the waitlist sees entries with: email, submission date, status (pending/approved/rejected/converted), any captured metadata (source, referrer, custom fields), and the date each status was reached
- An admin can search waitlist entries by email and filter by status
- An admin can approve a pending entry; approval generates an invite, sends an email to the entry's address, and moves the entry to "approved"
- An admin can reject a pending entry; rejection moves the entry to "rejected" and does not send an email
- An admin can resend an invite to an approved entry whose invite has expired or whose recipient lost the email
- When an approved invite is consumed during signup, the entry moves to "converted" and links to the resulting auth user
- The newly created user is provisioned at a starting billing tier chosen by the operator in config (defaulting to the app's free tier)
- The signup-mode setting, the default starting tier, and the per-mode copy are editable through the admin panel without code changes
- The waitlist signup form works on mobile web (responsive), even though the admin side does not
- The public waitlist form can be embedded on a marketing site that is not running the full BeakerStack app, posting to the same server-side capture endpoint; this is documented

### Security

- The public waitlist endpoint is rate-limited per IP and per email to prevent enumeration and flooding
- The endpoint does not differentiate its response based on whether the email already exists on the waitlist; observers cannot use submissions to probe membership
- Captured emails are stored such that they are not readable by anonymous or authenticated non-admin users through any client-accessible API; only admins (verified server-side) can read the list
- Invite tokens are cryptographically random, single-use, time-bounded, and revocable; expired or used tokens are rejected at the auth boundary
- The invite token is never logged in plaintext to server logs or browser URLs beyond what is strictly required to consume it once
- All sensitive operations (approve, reject, resend, change signup mode, change default tier) execute server-side with admin status verified server-side; relying on client-side route guards alone is rejected
- All admin actions on the waitlist (approve, reject, resend, config change) are recorded in the admin audit log
- Approval of an entry does not pre-create an auth user; the auth user is created only when the invite is consumed, so a leaked or never-clicked invite does not leave dangling auth accounts
- The system handles the case where the eventual auth identity (e.g., a Google OAuth signup) uses a different email than the one on the waitlist entry; the operator can configure whether this is strict (must match) or lenient (warn), defaulting to lenient with a logged warning
- The waitlist table's RLS posture is documented explicitly; the documentation states which roles can read, write, and update, and the rationale
- Email content sent to waitlist entries does not include sensitive information; the invite link itself is the only privileged content
- Documentation calls out the operator's responsibilities for GDPR / CCPA / similar regimes: right of deletion of waitlist entries, retention policy, lawful basis for collection

### React-like / OSS framework paradigms

- Waitlist capability ships as a reusable package separate from the app-template implementation; consumers can import it and use it without forking
- The signup-mode-aware signup component is a composable React component that consumers can wrap or replace; its decision logic is exposed as a hook (`useSignupMode` or similar) for consumers building their own variants
- The public waitlist form is a standalone component usable outside the main app shell, including on a marketing-only site, without requiring the full BeakerStack runtime
- The admin waitlist page is built from the admin panel's composable primitives (table, search, pagination, detail drawer), demonstrating the admin foundation rather than reimplementing
- Email content for invites is template-string based and consumer-overridable; adopters change copy and branding without forking component files
- The default starting billing tier for converted users is a config value, not hardcoded; it integrates with the existing billing module's tier configuration
- Per-mode copy (waitlist confirmation message, closed-signup message, invite-only message) is a config object the consumer edits, not framework-edited UI strings
- All package components are styled and editable JSX matching BeakerStack's template-first philosophy
- The package's public API surface is intentionally narrow: a configuration object, a signup-mode hook, a few opinionated components, a server-side capture function, and an invite-consumption helper
- Naming conventions, file structure, and export patterns match the existing `packages/billing` and `packages/admin` modules so consumers see a consistent paradigm across the framework
- Where the package needs to invoke side effects (sending email, granting billing tier), it does so through pluggable adapters; the consumer wires their chosen email provider and billing tier provisioner once, in app config, rather than the package mandating specific vendors

### Documentation

- The README for the waitlist package explains: the four signup modes and when to use each, how to embed the public form on an external site, how to customize copy, how to wire the email adapter, how to wire the billing-tier adapter, the security model, and the data lifecycle (pending -> approved -> converted, with retention guidance)
- The web app demonstrates the full flow end-to-end: a public form, an admin approval, an email delivery, an invite consumption, and a successful user signup
- Documentation includes a "painted door" pattern recipe showing the canonical use case: ship a landing page in waitlist mode, validate demand, then open signups
- Documentation explicitly addresses what happens to existing waitlist entries when the operator flips the mode (they remain, can still be approved manually, do not auto-convert)

## Dependencies

- **Admin panel feature** must be in place before the waitlist admin surface can be built; the waitlist page mounts inside the admin shell
- **Billing module** is the integration point for the starting-tier provisioning; the waitlist package depends on its tier-config interface
- **Authentication** is the integration point for invite-consumption signup; the waitlist package depends on the existing auth provider abstractions
- **Email sending** must exist as an adapter pattern in BeakerStack; if it does not yet, this feature is the right forcing function to introduce it. The package itself should not bind to a specific provider

## Operating assumptions

- Most adopters will use the waitlist for early-stage launches and will eventually transition the app to "open"
- Adopters will need to invite people in modest batches (tens to low hundreds at a time), not at automated marketing-list scale
- The waitlist is a single global queue, not segmented by product line or cohort
- Email is the only communication channel in v1
- The waitlist form is collected in good faith; adopters who need stronger bot mitigation (CAPTCHA, etc.) can layer it through the documented extension points

## Success signals

- A BeakerStack adopter can flip a setting and have a working waitlist in under 30 minutes, with no code changes beyond editing config and copy
- A founder running a painted-door launch can collect emails on a marketing-only site, then later import or directly admin-approve those entries when their app is ready
- An adopter operating in waitlist mode for several months finds no data integrity issues: no duplicate auth users from re-approval, no orphan invites, no leaked emails, no audit gaps
- A new admin feature added by an adopter (e.g., bulk-approve from CSV) can be built on top of the same primitives without modifying the waitlist package itself

## Open questions

These do not block the brief but need decisions before implementation:

- **Default invite expiration window.** Recommend 7 days; document how to change.
- **Strict vs lenient identity match on signup.** When the waitlisted email differs from the OAuth-provided email at invite consumption, recommend lenient with a warning logged to the audit log; some adopters with stricter compliance needs may want strict.
- **Whether to allow approved-not-converted entries to be re-issued an invite indefinitely, or to auto-expire to "rejected" after some window.** Recommend indefinite manual control in v1; let adopters decide retention.
- **Whether the public waitlist form should include a "tell us why you're interested" free-text field by default.** Recommend yes as optional, off by default, easy to enable in config; the qualitative data is valuable for painted-door validation.
