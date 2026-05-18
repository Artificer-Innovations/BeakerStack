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

No Resend/Kit required for v1. Default: **log adapter** (invite URL in Edge logs) + **Copy invite link** in admin.

Optional: wire a transactional provider via `waitlist-ops` `send_invite_email` body or extend the Edge function.

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
