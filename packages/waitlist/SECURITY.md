# Waitlist security model

## RLS posture

| Table                  | anon | authenticated | service_role / SECURITY DEFINER |
| ---------------------- | ---- | ------------- | ------------------------------- |
| `waitlist_settings`    | none | none          | RPCs only                       |
| `waitlist_entries`     | none | none          | capture + admin RPCs            |
| `waitlist_invites`     | none | none          | admin + validate/consume RPCs   |
| `waitlist_rate_limits` | none | none          | capture RPC only                |

RLS is **enabled** with **no** policies for `anon` / `authenticated` on PII tables.

## Public surface

- `waitlist_get_public_settings()` — mode + copy only (no emails).
- `waitlist_validate_invite(token)` — valid/invalid + invited email when valid (required for signup UI).
- `waitlist-capture` Edge Function — uniform success; no email enumeration.
- `waitlist-ops` `validate` / `consume` — custom tokens (not Supabase Auth `inviteUserByEmail`).

## Admin surface

All list/approve/reject/settings RPCs call `admin_is_admin()`. Non-admins get `{ error: 'not_found' }`.

## Tokens

- 32-byte random hex; stored as SHA-256 hash only.
- Single-use; revocable; TTL from `waitlist_settings.invite_ttl_days` (default 7).
- Prefer invite URLs with hash fragment: `/signup/invite#token=…`.

## GDPR / operator duties

- Document waitlist collection in privacy policy.
- Honor deletion requests (delete `waitlist_entries` row; use service role).
- Define retention for rejected/converted entries in your policy.
