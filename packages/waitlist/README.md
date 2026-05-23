# @beakerstack/waitlist

Signup gating, waitlist capture, invite tokens, and admin workflows for BeakerStack apps.

## Signup modes

| Mode          | Public `/signup` behavior                       |
| ------------- | ----------------------------------------------- |
| `open`        | Normal email/OAuth signup (default)             |
| `waitlist`    | Waitlist form; emails stored for admin approval |
| `invite_only` | Message only; signup via invite link            |
| `closed`      | Configurable message; no capture                |

Existing users can always use `/login`. Invite holders use `/signup/invite#token=…`.

## Quick start (app template)

1. Apply migrations and seed (`waitlist_settings` row in `supabase/seed.sql`).
2. Configure [`apps/web/src/waitlist/beakerstackWaitlistConfig.ts`](../../apps/web/src/waitlist/beakerstackWaitlistConfig.ts).
3. Grant admin: `npm run admin:grant -- you@example.com`.
4. Set mode in **Admin → Waitlist settings** (or leave `open` for dev).
5. Deploy Edge Functions `waitlist-capture` and `waitlist-ops`.

## Embed on a marketing site

Post to your project’s capture function (anon key + CORS):

```html
<form id="waitlist">
  <input name="email" type="email" required />
  <button type="submit">Join waitlist</button>
</form>
<script>
  document.getElementById('waitlist').addEventListener('submit', async e => {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    await fetch(
      'https://YOUR_PROJECT.supabase.co/functions/v1/waitlist-capture',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: 'YOUR_ANON_KEY',
        },
        body: JSON.stringify({ email }),
      }
    );
    alert('Thanks — you are on the list.');
  });
</script>
```

Set `WAITLIST_ALLOWED_ORIGINS` (or `BILLING_ALLOWED_ORIGINS`) on Edge Functions for your marketing origin.

## Email

Invite email delivery is handled by the `waitlist-ops` Edge Function using the `@beakerstack/email` adapter pattern.

### Adapter selection

| `WAITLIST_RESEND_API_KEY` set? | Behavior                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| No (default)                   | **Log adapter** — logs `to=` and `subject=` metadata to Edge logs; returns `501 email_not_configured`. Admin UI shows "Copy invite link".        |
| Yes                            | **Resend adapter** — sends email via `https://api.resend.com/emails`; returns `200 { ok: true }` on success or `502 email_send_failed` on error. |

### Edge Function env vars

| Variable                  | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `WAITLIST_RESEND_API_KEY` | Resend API key. Required for real email delivery.      |
| `WAITLIST_INVITE_FROM`    | Sender address (default: `onboarding@resend.dev`).     |
| `WAITLIST_INVITE_SUBJECT` | Email subject (default: `You are invited to sign up`). |
| `WAITLIST_INVITE_HTML`    | HTML template with `{{inviteUrl}}` placeholder.        |

Marketing nurture (ConvertKit) is a separate package — see `docs/specs/kit-integration-feature-brief.md`. Listen with `onLifecycleEvent('waitlist.joined' | 'waitlist.approved')`.

## Lifecycle events

- `waitlist.joined` — after capture
- `waitlist.approved` — after admin approve
- `waitlist.rejected` — after reject
- `waitlist.converted` — after invite signup completes

## Painted-door recipe

1. Set signup mode to **waitlist** in admin.
2. Point landing CTAs to `/signup` (or embed capture on static site).
3. Collect entries; optionally sync to Kit via lifecycle listener (future).
4. Approve batches; copy/send invite links.
5. Recipients complete signup at `/signup/invite`.
6. Flip mode to **open** when ready — existing waitlist rows remain; approve manually as needed.

## Security

See [SECURITY.md](./SECURITY.md).
