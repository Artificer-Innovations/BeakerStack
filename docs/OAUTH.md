# OAuth

Beaker Stack ships OAuth UI and session handling for web and mobile. You configure providers in Google/Apple consoles and Supabase — the app code is already wired.

## Overview

### What's already implemented

- OAuth UI (Google / Apple buttons) on web; native Google Sign-In on mobile
- **Web:** `signInWithOAuth`, redirect handling, `/auth/callback` route
- **Mobile:** `@react-native-google-signin/google-signin` → `signInWithIdToken` with Supabase (see `packages/shared/src/hooks/useAuth.native.ts`)
- Unit tests for auth flows

### What you configure

- OAuth apps in Google Cloud (and Apple Developer for Sign in with Apple)
- Client IDs/secrets in Supabase (local: `config.toml` + `.env.local`; cloud: dashboard)
- Redirect URLs that match Supabase's callback exactly

### Reading order

1. **Quick local setup** (below) — localhost Google + Supabase in ~15 minutes
2. **Production setup** — staging/production Google + Apple, Supabase cloud
3. **Mobile native flow** — native Google Sign-In and Supabase ID token exchange

Related: [testing/TESTING_OAUTH.md](testing/TESTING_OAUTH.md)

---

## Quick local setup

This is a quick reference for setting up OAuth with your existing Google OAuth credentials.

### Step 1: Configure Google OAuth Redirect URLs

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

### Step 2: Configure Supabase (Local Development)

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

### Step 3: Verify Configuration

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

### Troubleshooting

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

### Next Steps

Once Google OAuth is working, you can:

- Test the full sign-in flow
- Test sign-up flow (first-time Google user)
- Test protected routes with OAuth users

### Testing Checklist

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

### Checklist

**Already in the codebase:**

- OAuth UI (Google / Apple buttons) and `signInWithOAuth` on web
- Redirect handling and error states
- Unit tests for auth flows

**You configure:**

- OAuth apps in Google Cloud and Apple Developer
- Client IDs and secrets in Supabase
- Redirect URLs that match Supabase callbacks exactly

**Rough time:**

- **Google OAuth**: ~15 minutes
- **Apple OAuth**: ~30-45 minutes (requires Apple Developer account)
- **Supabase Config**: ~5 minutes
- **Testing**: ~10 minutes

### Google OAuth setup

#### Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Beaker Stack` (or your preferred name)
4. Click "Create"
5. Wait for project creation (usually ~30 seconds)

#### Step 2: Configure OAuth consent screen

No additional Google API needs to be enabled for sign-in — configure the OAuth consent screen, then create credentials.

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

#### Step 3: Create OAuth credentials

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

#### Step 4: Configure for mobile (optional)

If you want OAuth to work in the mobile app:

1. Create another OAuth client ID
2. Select "iOS" or "Android"
3. Follow platform-specific instructions
4. Add the bundle ID / package name from your Expo app

---

### Apple OAuth setup

#### Prerequisites

- Apple Developer account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/)

#### Step 1: Create an App ID

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

#### Step 2: Create a Services ID (for Web)

1. Go back to "Identifiers" → "+" button
2. Select "Services IDs" → Click "Continue"
3. Fill in:
   - **Description**: `Beaker Stack Web`
   - **Identifier**: `com.yourcompany.beakerstack.web`
4. Check "Sign in with Apple"
5. Click "Continue" → "Register"

#### Step 3: Configure Sign in with Apple

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

#### Step 4: Create a Private Key

1. Go to "Keys" → "+" button
2. Enter **Key Name**: `Beaker Stack Sign in with Apple Key`
3. Check "Sign in with Apple"
4. Click "Configure"
5. Select your Primary App ID
6. Click "Save" → "Continue" → "Register"
7. **Download the key file** (.p8 file)
   - **Important:** You can only download this once. Save it securely.
8. Note the **Key ID** (10-character string, e.g., `ABC123DEFG`)

#### Step 5: Get Your Team ID

1. Go to "Membership" in the Apple Developer Portal
2. Note your **Team ID** (10-character string, e.g., `XYZ987WXYZ`)

#### Step 6: Prepare Credentials for Supabase

You'll need these values:

- **Services ID**: `com.yourcompany.beakerstack.web`
- **Team ID**: From Step 5
- **Key ID**: From Step 4
- **Private Key**: Contents of the .p8 file from Step 4

---

### Supabase configuration

#### For Local Development

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

#### For Production (Supabase Cloud)

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Authentication" → "Providers"
4. Follow the same steps as local development above

#### Redirect URLs

Supabase automatically handles redirect URLs at:

```
Local:      http://localhost:54321/auth/v1/callback
Production: https://your-project-ref.supabase.co/auth/v1/callback
```

Your app will handle the redirect and extract the session.

---

### Testing OAuth

#### Local testing (web)

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

#### Local testing (mobile)

Mobile Google sign-in uses the native SDK and `signInWithIdToken`, not a browser OAuth redirect. See [Mobile native flow](#mobile-native-flow) and [MOBILE_BUILD_TESTING.md](MOBILE_BUILD_TESTING.md).

#### Manual verification

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

### Troubleshooting

#### Google OAuth Issues

##### "Error 400: redirect_uri_mismatch"

- **Cause**: Redirect URI not configured in Google Cloud Console
- **Fix**: Add the exact redirect URI to "Authorized redirect URIs"
  ```
  http://localhost:54321/auth/v1/callback
  ```

##### "Access blocked: This app's request is invalid"

- **Cause**: OAuth consent screen not configured
- **Fix**: Complete the OAuth consent screen setup in Step 2

##### "Error 401: invalid_client"

- **Cause**: Client ID or Secret incorrect in Supabase
- **Fix**: Double-check credentials in Supabase dashboard

#### Apple OAuth Issues

##### "invalid_client"

- **Cause**: Services ID, Team ID, or Key ID incorrect
- **Fix**: Verify all IDs match exactly (case-sensitive)

##### "Invalid key"

- **Cause**: Private key not formatted correctly
- **Fix**: Paste the entire contents of the .p8 file, including:
  ```
  -----BEGIN PRIVATE KEY-----
  [key contents]
  -----END PRIVATE KEY-----
  ```

##### "Redirect URI mismatch"

- **Cause**: Return URL not configured in Apple Developer Portal
- **Fix**: Add exact URL in Services ID configuration

#### General OAuth Issues

##### "OAuth provider not configured"

- **Cause**: Provider not enabled in Supabase
- **Fix**: Enable provider in Supabase dashboard

##### "Popup blocked"

- **Cause**: Browser blocking OAuth popup
- **Fix**: Allow popups for localhost/your domain

##### OAuth works locally but not in production

- **Cause**: Production redirect URLs not configured
- **Fix**: Add production URLs to both OAuth provider and Supabase

---

### Security best practices

#### Credentials storage

- **Never** commit OAuth credentials to git
- Store secrets in the Supabase dashboard (or your secret manager)
- Use environment variables for any app-side config
- Keep `.p8` files secure and backed up

#### Redirect URLs

- Use HTTPS in production (HTTP only for localhost)
- Whitelist specific domains (avoid wildcards)
- Keep redirect URLs as specific as possible

#### Scopes

- Only request necessary scopes (email, profile)
- Do not request unnecessary permissions
- Explain to users why you need each scope

---

### Next steps

Once OAuth is configured:

1. Test OAuth login flow
2. Verify user creation in the database
3. Test on multiple browsers
4. Test on mobile (see [Mobile native flow](#mobile-native-flow))
5. Document any custom OAuth flows for your team
6. Set up monitoring for OAuth errors

---

### Additional resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)

---

### Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) under Production setup
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify all credentials are correct
5. Ensure redirect URLs match exactly

**Common gotcha**: Redirect URLs must match EXACTLY (including protocol, port, and path).

---

## Mobile native flow

How sign-in differs on mobile vs web.

### Web vs mobile

**Web** uses the browser OAuth redirect flow: `signInWithOAuth` → Google → Supabase callback → your app’s `/auth/callback` route.

**Mobile (Google)** uses the native SDK, not a browser redirect loop:

1. User taps “Sign in with Google”
2. `@react-native-google-signin/google-signin` shows the native Google UI
3. App receives a Google **ID token**
4. `packages/shared/src/hooks/useAuth.native.ts` calls `supabase.auth.signInWithIdToken({ provider: 'google', token })`
5. Supabase session is established; the app navigates to the authenticated stack

Apple and email flows follow their own paths; configure providers in Supabase and platform consoles as for web where applicable.

### What is wired in the repo

- `@react-native-google-signin/google-signin` in `apps/mobile` (requires a **development build**, not Expo Go)
- `useAuth.native.ts` — Google Sign-In configuration from env (`EXPO_PUBLIC_GOOGLE_*` client IDs)
- `scheme: 'beaker-stack'` in `apps/mobile/app.config.js` (for other deep links; Google sign-in does not rely on `beaker-stack://auth/callback` for the native flow)

### Configure Google for mobile

1. In [Google Cloud Console](https://console.cloud.google.com/), create **iOS** and/or **Android** OAuth clients (in addition to the web client used by Supabase redirects).
2. Set bundle ID / package name to match `apps/mobile/app.config.js`.
3. Add the **Web client ID** to `.env.local` / EAS secrets as required by the Google Sign-In SDK (see `useAuth.native.ts` and mobile env docs).
4. Enable Google in Supabase Auth for your project.

### Test on device or simulator

1. Use a dev client build (`npm run mobile:build:dev:ios` or Android equivalent) — see [MOBILE_BUILD_TESTING.md](MOBILE_BUILD_TESTING.md).
2. `npm run mobile` from the repo root; open Login and tap Google sign-in.
3. Confirm the user appears in Supabase Studio → Authentication.

### Troubleshooting (mobile)

**“Google Sign-In module not available”** — run a development build, not Expo Go.

**Sign-in succeeds but no session** — verify web client ID env vars and that `signInWithIdToken` is allowed for Google in Supabase.

**Play Services errors (Android)** — emulator/device needs Google Play services; see SDK docs.

For web OAuth redirect issues, use the troubleshooting sections above (Quick local / Production).
