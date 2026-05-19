# Password Reset Flow

## End-to-end flow

### Web

1. User clicks **Forgot password?** on `/login` → `/forgot-password`
2. User enters email, submits. `auth.requestPasswordReset(email)` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where `redirectTo` is built by `getAuthRedirectUrl()`:
   - Standard: `https://app.example.com/auth/confirm`
   - PR previews: `https://pr-9.example.com/pr-9/auth/confirm`
3. User receives email, clicks link → browser opens `/auth/confirm?token_hash=...&type=recovery`
4. `AuthConfirmPage` calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`. On success, redirects to `/reset-password`. On error (expired or already used), redirects to `/forgot-password?expired=1`.
5. `ResetPasswordPage` calls `supabase.auth.getSession()` on mount. If no session (link expired or revisited after use), redirects to `/forgot-password?expired=1`. With a valid session, the user sets a new password via `auth.updatePassword(password)` and is sent to `/dashboard` with `replace: true`.

### Mobile (iOS / Android)

1. User taps **Forgot password?** on `LoginScreen` → `ForgotPasswordScreen`
2. User enters email, submits. `auth.requestPasswordReset(email)` calls `resetPasswordForEmail(email, { redirectTo: 'beaker-stack://auth/confirm' })`
3. User receives email, taps link → app opens via deep link to `AuthConfirmScreen`
4. `AuthConfirmScreen` calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`:
   - Success → navigate to `ResetPasswordScreen`
   - Error → navigate to `ForgotPasswordScreen`
5. `ResetPasswordScreen` guards on `getSession()`. No session → navigate to `ForgotPasswordScreen`. With session, user sets new password via `auth.updatePassword(password)` and is reset-navigated to `Dashboard`.

## Token-hash flow vs legacy hash-fragment flow

BeakerStack uses the **token-hash strategy** throughout: email links contain `?token_hash=...&type=recovery` as query parameters (not `#access_token=...` hash fragments). `AuthConfirmPage` / `AuthConfirmScreen` calls `verifyOtp()` to exchange the token for a session, then redirects to the appropriate page.

This is the Supabase-recommended PKCE-compatible approach and avoids exposing tokens in browser history or server logs.

`AuthCallbackPage` handles OAuth and legacy hash redirects. Password recovery routed through `/auth/callback` uses layered guards in `apps/web/src/lib/supabase.ts`:

1. **Synchronous URL capture** (`isPasswordRecoveryCallback`) — reads `type=recovery` before Supabase initializes and clears the hash, persisting intent in `sessionStorage`.
2. **Synchronous URL hash check** (`type=recovery`) — prevents the `auth.user` branch from running while the `onAuthStateChange` subscription hasn't fired yet.
3. **`onAuthStateChange(PASSWORD_RECOVERY)`** — the authoritative redirect to `/reset-password`.
4. **Recovery fallback timer** (~1.5s) — if a session exists but `PASSWORD_RECOVERY` never fires (e.g. stale localStorage session), navigate to `/reset-password` anyway.

## Supabase redirect URL allowlist

Add these to your Supabase project's **Auth → URL Configuration → Redirect URLs**:

| Environment | URL                                               |
| ----------- | ------------------------------------------------- |
| Local dev   | `http://localhost:5173/auth/confirm`              |
| Staging     | `https://staging.beakerstack.com/auth/confirm`    |
| Production  | `https://app.beakerstack.com/auth/confirm`        |
| PR previews | `https://pr-*.beakerstack.com/pr-*/auth/confirm`  |
| Mobile      | `beaker-stack://auth/confirm`                     |

## Mobile deep-link setup

The app scheme is `beaker-stack` (configured in `app.json` → `expo.scheme`). React Navigation's `linking` config in `AppNavigator.tsx` maps `beaker-stack://auth/confirm` to the `AuthConfirm` screen. The screen reads `token_hash` and `type` from the URL query parameters and calls `verifyOtp()`.

## Manual test checklist

### Local dev (web — Inbucket)

- [ ] `/forgot-password` with an unknown address shows the non-enumerating success message
- [ ] `/forgot-password` with a known address: check Inbucket for email, click link → lands on `/reset-password`
- [ ] Set new password ≥ 8 chars → redirected to `/dashboard`
- [ ] Revisit the reset URL after using it → redirected to `/forgot-password?expired=1`
- [ ] Google OAuth callback still routes to `/dashboard` (regression)
- [ ] PR preview: reset link email uses `/pr-N/auth/confirm` in `redirectTo`

### Local dev (mobile — Expo Go / simulator)

- [ ] `ForgotPasswordScreen` → submit known address → success message stays on screen
- [ ] Tap reset link from email → app opens to `AuthConfirmScreen` → lands on `ResetPasswordScreen`
- [ ] Set new password ≥ 8 chars → navigate to `Dashboard`
- [ ] Password < 8 chars → alert shown, `updatePassword` not called
- [ ] Revisit link after use → `ForgotPasswordScreen` (no session)
- [ ] Mismatch confirmation → alert shown

## Password minimum length

`MIN_PASSWORD_LENGTH = 8` (from `packages/shared/src/constants/auth.ts`) must match the **Minimum password length** setting in Supabase → Authentication → Password. Update both together if the requirement changes.

