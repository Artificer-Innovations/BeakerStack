# Password Reset Flow

## End-to-end flow

### Web

1. User clicks **Forgot password?** on `/login` → `/forgot-password`
2. User enters email, submits. `auth.requestPasswordReset(email)` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where `redirectTo` is built by `getAuthRedirectUrl()`:
   - Standard: `https://app.example.com/auth/callback`
   - PR previews: `https://pr-9.example.com/pr-9/auth/callback`
3. User receives email, clicks link → browser opens `/auth/callback#access_token=...&type=recovery`
4. `AuthCallbackPage` detects `type=recovery` in the hash **before** the `auth.user → /dashboard` branch, then subscribes to `onAuthStateChange`. When the `PASSWORD_RECOVERY` event fires, the page navigates to `/reset-password`.
5. `ResetPasswordPage` calls `supabase.auth.getSession()` on mount. If no session (link expired or revisited after use), redirects to `/forgot-password?expired=1`. With a valid session, the user sets a new password via `auth.updatePassword(password)` and is sent to `/dashboard` with `replace: true`.

### Mobile (iOS / Android)

1. User taps **Forgot password?** on `LoginScreen` → `ForgotPasswordScreen`
2. User enters email, submits. `auth.requestPasswordReset(email)` calls `resetPasswordForEmail(email, { redirectTo: 'beaker-stack://auth/callback' })`
3. User receives email, taps link → app opens via deep link to `AuthCallbackScreen`
4. `AuthCallbackScreen` subscribes to `onAuthStateChange`:
   - `PASSWORD_RECOVERY` → navigate to `ResetPasswordScreen`
   - `SIGNED_IN` → navigate to `Dashboard`
5. `ResetPasswordScreen` guards on `getSession()`. No session → navigate to `ForgotPasswordScreen`. With session, user sets new password via `auth.updatePassword(password)` and is reset-navigated to `Dashboard`.

## `PASSWORD_RECOVERY` event ordering

The `PASSWORD_RECOVERY` event from `supabase.auth.onAuthStateChange` is the authoritative signal that a user is in a reset session. On web, `AuthCallbackPage` must subscribe to this event **before** the generic `auth.user → /dashboard` check — otherwise an already-established recovery session would route to the dashboard instead of the reset form.

The guard is layered:

1. **Synchronous URL capture** (`isPasswordRecoveryCallback` in `apps/web/src/lib/supabase.ts`) — reads `type=recovery` before Supabase initializes and clears the hash, persisting intent in `sessionStorage`.
2. **Synchronous URL hash check** (`type=recovery`) — prevents the `auth.user` branch from running while the `onAuthStateChange` subscription hasn't fired yet.
3. **`onAuthStateChange(PASSWORD_RECOVERY)`** — the authoritative redirect to `/reset-password`.
4. **Recovery fallback timer** (~1.5s) — if a session exists but `PASSWORD_RECOVERY` never fires (e.g. stale localStorage session), navigate to `/reset-password` anyway.

## Supabase redirect URL allowlist

Add these to your Supabase project's **Auth → URL Configuration → Redirect URLs**:

| Environment | URL                                               |
| ----------- | ------------------------------------------------- |
| Local dev   | `http://localhost:5173/auth/callback`             |
| Staging     | `https://staging.beakerstack.com/auth/callback`   |
| Production  | `https://app.beakerstack.com/auth/callback`       |
| PR previews | `https://pr-*.beakerstack.com/pr-*/auth/callback` |
| Mobile      | `beaker-stack://auth/callback`                    |

## Mobile deep-link setup

The app scheme is `beaker-stack` (configured in `app.json` → `expo.scheme`). React Navigation's `linking` config in `AppNavigator.tsx` maps `beaker-stack://auth/callback` to the `AuthCallback` screen. `detectSessionInUrl: true` in `apps/mobile/src/lib/supabase.ts` allows Supabase to parse tokens from the deep-link URL.

## Manual test checklist

### Local dev (web — Inbucket)

- [ ] `/forgot-password` with an unknown address shows the non-enumerating success message
- [ ] `/forgot-password` with a known address: check Inbucket for email, click link → lands on `/reset-password`
- [ ] Set new password ≥ 8 chars → redirected to `/dashboard`
- [ ] Revisit the reset URL after using it → redirected to `/forgot-password?expired=1`
- [ ] Google OAuth callback still routes to `/dashboard` (regression)
- [ ] PR preview: reset link email uses `/pr-N/auth/callback` in `redirectTo`

### Local dev (mobile — Expo Go / simulator)

- [ ] `ForgotPasswordScreen` → submit known address → success message stays on screen
- [ ] Tap reset link from email → app opens to `AuthCallbackScreen` → lands on `ResetPasswordScreen`
- [ ] Set new password ≥ 8 chars → navigate to `Dashboard`
- [ ] Password < 8 chars → alert shown, `updatePassword` not called
- [ ] Revisit link after use → `ForgotPasswordScreen` (no session)
- [ ] Mismatch confirmation → alert shown

## Password minimum length

`MIN_PASSWORD_LENGTH = 8` (from `packages/shared/src/constants/auth.ts`) must match the **Minimum password length** setting in Supabase → Authentication → Password. Update both together if the requirement changes.
