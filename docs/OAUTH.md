# OAuth

BeakerStack ships OAuth UI and session handling for web and mobile. You configure providers in Google/Apple consoles and Supabase — the app code is already wired.

## Overview

### What's already implemented

- OAuth UI (Google / Apple buttons)
- `signInWithOAuth`, redirect handling, error states
- Web callback route and mobile deep-link flow (`expo-auth-session`)
- Unit tests for auth flows

### What you configure

- OAuth apps in Google Cloud (and Apple Developer for Sign in with Apple)
- Client IDs/secrets in Supabase (local: `config.toml` + `.env.local`; cloud: dashboard)
- Redirect URLs that match Supabase's callback exactly

### Reading order

1. **Quick local setup** (below) — localhost Google + Supabase in ~15 minutes
2. **Production setup** — staging/production Google + Apple, Supabase cloud
3. **Mobile native flow** — deep links and Expo AuthSession

Related: [testing/TESTING_OAUTH.md](testing/TESTING_OAUTH.md)

---

## Quick local setup

This is a quick reference for setting up OAuth with your existing Google OAuth credentials.

## Step 1: Configure Google OAuth Redirect URLs

**IMPORTANT**: Google sees Supabase's callback URL, NOT your app's callback URL.

Your Google OAuth app needs to allow these redirect URLs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your OAuth client ID
4. **Clear any existing redirect URIs** that point to your app (like `http://localhost:5173/auth/callback`)
5. Add **BOTH** of these **Authorized redirect URIs** (Supabase might use either):

   ```
   http://localhost:54321/auth/v1/callback
   http://127.0.0.1:54321/auth/v1/callback
   ```

   **Why both?** Supabase may send either `localhost` or `127.0.0.1` depending on how it's accessed. Google treats them as different URLs, so we need both.

   **Note**: These are `localhost:54321` or `127.0.0.1:54321` (Supabase), NOT `localhost:5173` (your web app)

   (For production, also add: `https://your-project-ref.supabase.co/auth/v1/callback`)

6. Click "Save"

**How it works:**

- Your app redirects to Google → Google redirects to Supabase (`localhost:54321/auth/v1/callback`) → Supabase redirects to your app (`localhost:5173/auth/callback`)
- Google only sees the Supabase URL, so that's what must be in Google Cloud Console

## Step 2: Configure Supabase (Local Development)

**Note**: Local Supabase Studio doesn't have a "Providers" UI. You must configure OAuth via `config.toml` and environment variables.

1. **Create/Update `.env.local`** in the root directory (create it if it doesn't exist):

   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id-here
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret-here
   ```

   Replace `your-client-id-here` with your actual Google Client ID and `your-client-secret-here` with your actual Google Client Secret.

2. **Verify config.toml** is set up correctly:
   - The file `supabase/config.toml` should already have `[auth.external.google]` section
   - It should have `enabled = true`
   - It uses environment variables: `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` and `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`

3. **Restart Supabase** to load the new configuration:

   ```bash
   supabase stop
   supabase start
   ```

   **Important**: Supabase reads `.env.local` from the root directory where you run `supabase start`

## Step 3: Verify Configuration

1. **Check config**:

   ```bash
   # Verify Supabase is reading the config
   supabase status
   ```

2. **Test OAuth in your app**:
   - Navigate to `/login` in your web app
   - Click "Sign in with Google"
   - You should be redirected to Google's OAuth consent screen
   - After consent, you should be redirected back and logged in

## Troubleshooting

**Issue: "redirect_uri_mismatch" error (Error 400)**

- **Common mistake**: You added `http://localhost:5173/auth/callback` to Google → **WRONG!**
- **Correct solution**: Add **BOTH** to Google Cloud Console:
  - `http://localhost:54321/auth/v1/callback`
  - `http://127.0.0.1:54321/auth/v1/callback`
- **Why both?** Supabase may use either `localhost` or `127.0.0.1` - Google treats them as different URLs
- Remove any app URLs from Google Cloud Console redirect URIs
- The flow: Google → Supabase → Your App (Google only sees Supabase's URL)
- **Still failing?** Check browser Network tab to see which redirect_uri Supabase actually sends

**Issue: OAuth button doesn't work**

- Solution: Check that `enabled = true` in `config.toml` and you've restarted Supabase

**Issue: "Invalid client" error**

- Solution: Verify your Client ID and Secret are correct in Supabase Studio

## Next Steps

Once Google OAuth is working, you can:

- Test the full sign-in flow
- Test sign-up flow (first-time Google user)
- Test protected routes with OAuth users

## Testing Checklist

After configuring everything:

- [ ] Restarted Supabase (`supabase stop && supabase start`)
- [ ] Waited 2-3 minutes for Google settings to propagate (if just changed)
- [ ] Tried OAuth flow in incognito/private browser window
- [ ] Verified redirect URI in browser Network tab matches `http://localhost:54321/auth/v1/callback`

If you see `redirect_uri_mismatch` error:

1. Check browser Network tab → find Google OAuth request → verify the `redirect_uri` parameter
2. Ensure it's exactly: `http://localhost:54321/auth/v1/callback` (not `127.0.0.1`, not your app URL)
3. If different, the issue is in Supabase config or Google hasn't updated yet

---

## Production setup

This guide walks you through setting up Google and Apple OAuth for your Beaker Stack in production. The OAuth implementation is already complete in the codebase - you just need to configure the OAuth providers.

---

## Table of Contents

1. [Overview](#overview)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Apple OAuth Setup](#apple-oauth-setup)
4. [Supabase Configuration](#supabase-configuration)
5. [Testing OAuth](#testing-oauth)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What's Already Implemented

✅ OAuth UI components (Google/Apple buttons)
✅ OAuth authentication logic (`signInWithOAuth`)
✅ Redirect URL handling
✅ Error handling and loading states
✅ Unit tests for OAuth flows

### What You Need to Do

⚠️ Create OAuth applications with Google and Apple
⚠️ Configure OAuth credentials in Supabase
⚠️ Set up redirect URLs
⚠️ Test the OAuth flow

### Expected Time

- **Google OAuth**: ~15 minutes
- **Apple OAuth**: ~30-45 minutes (requires Apple Developer account)
- **Supabase Config**: ~5 minutes
- **Testing**: ~10 minutes

---

## Google OAuth Setup

### Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Beaker Stack` (or your preferred name)
4. Click "Create"
5. Wait for project creation (usually ~30 seconds)

### Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Go to "APIs & Services" → "Library"
3. Search for "Google+ API"
4. Click on "Google+ API"
5. Click "Enable"

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in required fields:
   - **App name**: `Beaker Stack`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Add: `userinfo.email`
   - Add: `userinfo.profile`
   - Add: `openid`
7. Click "Save and Continue"
8. **Test users** (optional for development):
   - Add your email and any test user emails
9. Click "Save and Continue"
10. Review and click "Back to Dashboard"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Enter name: `Beaker Stack Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://yourdomain.com
   ```
6. **Authorized redirect URIs**:

   ```
   http://localhost:54321/auth/v1/callback
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

   **Important**: Replace `your-project-ref` with your actual Supabase project reference ID (found in Supabase Dashboard → Settings → API)

7. Click "Create"
8. **Save these credentials** (you'll need them for Supabase):
   - Client ID (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-abc123xyz789`)

### Step 5: Configure for Mobile (Optional)

If you want OAuth to work in the mobile app:

1. Create another OAuth client ID
2. Select "iOS" or "Android"
3. Follow platform-specific instructions
4. Add the bundle ID / package name from your Expo app

---

## Apple OAuth Setup

### Prerequisites

- Apple Developer account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/)

### Step 1: Create an App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → "+" button
4. Select "App IDs" → Click "Continue"
5. Select "App" → Click "Continue"
6. Fill in:
   - **Description**: `Beaker Stack`
   - **Bundle ID**: `com.yourcompany.beakerstack` (must match your app)
7. Under "Capabilities", check "Sign in with Apple"
8. Click "Continue" → "Register"

### Step 2: Create a Services ID (for Web)

1. Go back to "Identifiers" → "+" button
2. Select "Services IDs" → Click "Continue"
3. Fill in:
   - **Description**: `Beaker Stack Web`
   - **Identifier**: `com.yourcompany.beakerstack.web`
4. Check "Sign in with Apple"
5. Click "Continue" → "Register"

### Step 3: Configure Sign in with Apple

1. Click on your Services ID (`com.yourcompany.beakerstack.web`)
2. Check "Sign in with Apple"
3. Click "Configure"
4. **Primary App ID**: Select your App ID from Step 1
5. **Domains and Subdomains**:
   ```
   yourdomain.com
   your-project-ref.supabase.co
   ```
6. **Return URLs**:

   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

   **Important**: Replace `your-project-ref` with your Supabase project reference

7. Click "Next" → "Done" → "Continue" → "Save"

### Step 4: Create a Private Key

1. Go to "Keys" → "+" button
2. Enter **Key Name**: `Beaker Stack Sign in with Apple Key`
3. Check "Sign in with Apple"
4. Click "Configure"
5. Select your Primary App ID
6. Click "Save" → "Continue" → "Register"
7. **Download the key file** (.p8 file)
   - ⚠️ **IMPORTANT**: You can only download this once! Save it securely.
8. Note the **Key ID** (10-character string, e.g., `ABC123DEFG`)

### Step 5: Get Your Team ID

1. Go to "Membership" in the Apple Developer Portal
2. Note your **Team ID** (10-character string, e.g., `XYZ987WXYZ`)

### Step 6: Prepare Credentials for Supabase

You'll need these values:

- **Services ID**: `com.yourcompany.beakerstack.web`
- **Team ID**: From Step 5
- **Key ID**: From Step 4
- **Private Key**: Contents of the .p8 file from Step 4

---

## Supabase Configuration

### For Local Development

1. Open your local Supabase dashboard:

   ```bash
   supabase start
   # Opens at http://localhost:54323
   ```

2. Go to "Authentication" → "Providers"

3. **Configure Google**:
   - Toggle "Google" to enabled
   - Enter **Client ID** from Google setup
   - Enter **Client Secret** from Google setup
   - Click "Save"

4. **Configure Apple**:
   - Toggle "Apple" to enabled
   - Enter **Services ID** (e.g., `com.yourcompany.beakerstack.web`)
   - Enter **Team ID**
   - Enter **Key ID**
   - Paste **Private Key** (entire contents of .p8 file)
   - Click "Save"

### For Production (Supabase Cloud)

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Authentication" → "Providers"
4. Follow the same steps as local development above

### Redirect URLs

Supabase automatically handles redirect URLs at:

```
Local:      http://localhost:54321/auth/v1/callback
Production: https://your-project-ref.supabase.co/auth/v1/callback
```

Your app will handle the redirect and extract the session.

---

## Testing OAuth

### Local Testing (Web App)

1. Start your local Supabase:

   ```bash
   supabase start
   ```

2. Start your web app:

   ```bash
   cd apps/web
   npm run dev
   ```

3. Navigate to login page: `http://localhost:5173/login`

4. Click "Sign in with Google" or "Sign in with Apple"

5. **Expected flow**:
   - Opens OAuth provider login popup/redirect
   - User authenticates with Google/Apple
   - Redirects back to your app
   - User is logged in
   - Redirects to home/dashboard

### Local Testing (Mobile App)

1. Start your mobile app:

   ```bash
   cd apps/mobile
   npm start
   ```

2. OAuth in mobile requires additional setup:
   - Expo's `AuthSession` for web-based OAuth
   - Or native modules for true native OAuth
   - See Expo's [AuthSession docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)

### Manual Verification

After successful OAuth login, verify:

1. **User appears in Supabase**:
   - Open Supabase Studio
   - Go to "Authentication" → "Users"
   - You should see the new user with provider info

2. **Auth state in app**:
   - Check the debug UI on home page
   - Should show `user` and `session` populated
   - `user.app_metadata.provider` should be `google` or `apple`

3. **User profile created**:
   - Go to "Table Editor" → `user_profiles`
   - Should see a profile for the new user (created by trigger)

---

## Troubleshooting

### Google OAuth Issues

#### "Error 400: redirect_uri_mismatch"

- **Cause**: Redirect URI not configured in Google Cloud Console
- **Fix**: Add the exact redirect URI to "Authorized redirect URIs"
  ```
  http://localhost:54321/auth/v1/callback
  ```

#### "Access blocked: This app's request is invalid"

- **Cause**: OAuth consent screen not configured
- **Fix**: Complete the OAuth consent screen setup in Step 3

#### "Error 401: invalid_client"

- **Cause**: Client ID or Secret incorrect in Supabase
- **Fix**: Double-check credentials in Supabase dashboard

### Apple OAuth Issues

#### "invalid_client"

- **Cause**: Services ID, Team ID, or Key ID incorrect
- **Fix**: Verify all IDs match exactly (case-sensitive)

#### "Invalid key"

- **Cause**: Private key not formatted correctly
- **Fix**: Paste the entire contents of the .p8 file, including:
  ```
  -----BEGIN PRIVATE KEY-----
  [key contents]
  -----END PRIVATE KEY-----
  ```

#### "Redirect URI mismatch"

- **Cause**: Return URL not configured in Apple Developer Portal
- **Fix**: Add exact URL in Services ID configuration

### General OAuth Issues

#### "OAuth provider not configured"

- **Cause**: Provider not enabled in Supabase
- **Fix**: Enable provider in Supabase dashboard

#### "Popup blocked"

- **Cause**: Browser blocking OAuth popup
- **Fix**: Allow popups for localhost/your domain

#### OAuth works locally but not in production

- **Cause**: Production redirect URLs not configured
- **Fix**: Add production URLs to both OAuth provider and Supabase

---

## Security Best Practices

### Credentials Storage

❌ **NEVER** commit OAuth credentials to git
✅ Store in Supabase dashboard only
✅ Use environment variables for any app-side config
✅ Keep .p8 files secure and backed up

### Redirect URLs

✅ Use HTTPS in production (HTTP only for localhost)
✅ Whitelist specific domains (don't use wildcards)
✅ Keep redirect URLs as specific as possible

### Scopes

✅ Only request necessary scopes (email, profile)
❌ Don't request unnecessary permissions
✅ Explain to users why you need each scope

---

## Next Steps

Once OAuth is configured:

1. ✅ Test OAuth login flow
2. ✅ Verify user creation in database
3. ✅ Test on multiple browsers
4. ✅ Test on mobile (if applicable)
5. ✅ Document any custom OAuth flows for your team
6. ✅ Set up monitoring for OAuth errors

---

## Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify all credentials are correct
5. Ensure redirect URLs match exactly

**Common gotcha**: Redirect URLs must match EXACTLY (including protocol, port, and path).

---

## Mobile native flow

This guide explains how OAuth works in the mobile app (iOS and Android) vs the web app.

## Key Differences: Mobile vs Web OAuth

### Web App Flow:

1. User clicks "Sign in with Google"
2. Browser redirects to Google → User authorizes → Google redirects to Supabase
3. Supabase redirects to `http://localhost:5173/auth/callback` (web URL)
4. Web app handles the callback and extracts session

### Mobile App Flow:

1. User clicks "Sign in with Google"
2. App opens OAuth in browser (using Expo AuthSession)
3. User authorizes → Google redirects to Supabase
4. Supabase redirects to `beaker-stack://auth/callback` (deep link)
5. Deep link opens the app → App handles callback and sets session

## Configuration Completed

✅ **Installed Dependencies:**

- `expo-auth-session` - Handles OAuth flows
- `expo-web-browser` - Opens OAuth in browser

✅ **Updated `app.json`:**

- Added `scheme: "beaker-stack"` for deep linking
- Added iOS `bundleIdentifier` and Android `package`

✅ **Created Mobile OAuth Handler:**

- `apps/mobile/src/lib/oauth.ts` - Mobile-specific OAuth implementation

✅ **Created Platform-Specific Hook:**

- `packages/shared/src/hooks/useAuth.native.ts` - Uses mobile OAuth handler

✅ **Updated Supabase Config:**

- Added mobile redirect URLs to `additional_redirect_urls`

## Testing Mobile OAuth

### Prerequisites:

1. **Restart Supabase** (to load new redirect URLs):

   ```bash
   supabase stop
   supabase start
   ```

2. **Rebuild/Reload Mobile App:**
   ```bash
   cd apps/mobile
   npm start
   # Then press 'i' for iOS or 'a' for Android
   ```

### Test Flow:

1. Open the mobile app (iOS or Android)
2. Navigate to Login screen
3. Tap "Sign in with Google"
4. Browser should open with Google OAuth
5. After authorizing, app should automatically open
6. User should be logged in and redirected to Dashboard

## Troubleshooting

**Issue: OAuth opens browser but app doesn't reopen after auth**

- Solution: Verify `scheme: "beaker-stack"` is configured in your Expo app (`app.config.js` or `app.json`)
- Solution: Restart Expo dev server after changing `app.json`

**Issue: "redirect_uri_mismatch" error in mobile**

- Solution: The mobile redirect URL (`beaker-stack://auth/callback`) is automatically handled by Supabase
- Solution: Ensure Supabase config includes `beaker-stack://auth/callback` in `additional_redirect_urls`

**Issue: Deep link not working**

- Solution: On iOS, may need to build with EAS or use Expo Go
- Solution: On Android, ensure `android.package` matches your app

**Issue: "Cannot find module '../../mobile/src/lib/oauth'"**

- Solution: This is expected - the path is resolved at runtime
- Solution: Make sure `apps/mobile/src/lib/oauth.ts` exists

## Production Considerations

For production mobile apps:

1. Update `scheme` in `app.json` to your production scheme
2. Add production deep link URL to Supabase `additional_redirect_urls`
3. Configure iOS/Android OAuth client IDs in Google Cloud Console
4. Test with production build (not just Expo Go)

## Next Steps

After testing:

- ✅ OAuth works on web
- ⏳ OAuth works on iOS (test)
- ⏳ OAuth works on Android (test)
- ⏳ User profiles created automatically (verify in Supabase Studio)
