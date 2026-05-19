# @beakerstack/lifecycle-events

Framework-wide lifecycle event bus. Stable public API — event names follow a deprecation cycle before removal.

Zero runtime dependencies. No React, no Supabase client.

## Event taxonomy

| Event | Source | When it fires |
|---|---|---|
| `waitlist.joined` | `waitlist-ops` Edge Function | User submits waitlist form |
| `waitlist.approved` | `waitlist-ops` Edge Function | Admin approves a waitlist entry |
| `waitlist.rejected` | `waitlist-ops` Edge Function | Admin rejects a waitlist entry |
| `waitlist.converted` | `waitlist-ops` Edge Function | Waitlist invite accepted; user completes signup |
| `user.signed_up` | `auth.users` AFTER INSERT trigger | Any auth user created (direct, invite, OAuth) |
| `user.tier_changed` | `stripe-webhook` Edge Function | Subscription tier changes |
| `user.churned` | `stripe-webhook` Edge Function | Subscription cancelled or expired |

## Payload fields

All events include:

| Field | Type | Notes |
|---|---|---|
| `email` | `string` | Required |
| `userId` | `string?` | Auth user UUID; absent for pre-signup events |
| `entryId` | `string?` | Waitlist entry ID; present on `waitlist.*` events |
| `metadata` | `Record<string, unknown>?` | Arbitrary pass-through |
| `previousTier` | `string?` | `user.tier_changed` only |
| `newTier` | `string?` | `user.tier_changed` only |

## `waitlist.converted` vs `user.signed_up`

An invite-flow user who was on the waitlist fires **both** `waitlist.converted` (from `waitlist-ops`) and `user.signed_up` (from the `auth.users` trigger). The marketing-email sync queue uses `idempotency_key` to deduplicate if both paths enqueue the same operation.

## Usage

```ts
import { onLifecycleEvent, emitLifecycleEvent } from '@beakerstack/lifecycle-events';

// Register a listener — returns a cleanup function
const off = onLifecycleEvent(async (event, payload) => {
  if (event === 'user.signed_up') {
    await syncToMarketingProvider(payload.email);
  }
});

// Emit (server-side only — see emission rules below)
await emitLifecycleEvent('user.signed_up', { email, userId });

// Unregister
off();
```

## Emission rules

- **Server-side only.** No browser code emits lifecycle events or inserts to the sync queue directly.
- The `auth.users` AFTER INSERT trigger covers all signup paths — do not also emit from the client-side auth callback.
- All server-side emission points check `marketing_email_settings.enabled` before enqueuing.

## Edge Functions

Supabase Edge Functions (Deno) cannot import from private workspace packages. Use `supabase/functions/_shared/lifecycle.ts` (a self-contained Deno copy) for emission from Edge Functions.
