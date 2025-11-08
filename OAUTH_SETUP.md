# OAuth Setup Guide for Production

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
