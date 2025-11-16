# Supabase Preview Environment Setup

This guide explains how to configure your Supabase preview project for PR preview deployments. This includes setting up Google OAuth, configuring site URLs and redirect URLs for preview domains, and disabling email confirmation for preview environments.

## Overview

Each PR preview deploys to a unique path on the deploy domain (e.g., `https://deploy.beakerstack.com/pr-9/`). The Supabase preview project must be configured to:

- Allow OAuth redirects from the deploy domain with path patterns
- Use the correct site URL for email confirmation links (or disable email confirmation)
- Enable Google OAuth provider with proper redirect URLs

## Prerequisites

Before starting, ensure you have:

- A dedicated Supabase project for PR previews (separate from production/staging)
- Your deploy/preview domain (e.g., `deploy.beakerstack.com`)
- Google OAuth credentials (Client ID and Secret)
- Access to the Supabase dashboard for your preview project

## Finding Required Values

Before configuring, locate these values in your Supabase dashboard:

1. **Project Reference ID** (Project Ref)
   - Navigate to: Settings → General
   - Copy the **Reference ID** (e.g., `pvavpnumwsgzapfhziag`)
   - This is the value for `SUPABASE_PREVIEW_PROJECT_REF`

2. **API URL**
   - Navigate to: Settings → API
   - Copy the **Project URL** (e.g., `https://pvavpnumwsgzapfhziag.supabase.co`)
   - This is the value for `PREVIEW_SUPABASE_URL`

3. **Anon Key**
   - Navigate to: Settings → API
   - Copy the **anon public** key
   - This is the value for `PREVIEW_SUPABASE_ANON_KEY`

4. **Database Password**
   - Navigate to: Settings → Database
   - Copy or reset the database password
   - This is the value for `SUPABASE_PREVIEW_DB_PASSWORD`

5. **Access Token** (for CLI operations)
   - Navigate to: Account Settings → Access Tokens
   - Create a new token with appropriate permissions
   - This is the value for `SUPABASE_ACCESS_TOKEN`

## Step 1: Configure Google OAuth

### 1.1 Enable Google Provider in Supabase

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle the switch to **Enable** Google provider
5. Fill in the following fields:
   - **Client ID (for OAuth)**: Your Google OAuth Client ID
     - Example: `123456789-abc123xyz.apps.googleusercontent.com`
   - **Client Secret (for OAuth)**: Your Google OAuth Client Secret
     - Example: `GOCSPX-abc123xyz789`
6. Click **Save**

### 1.2 Configure Google Cloud Console OAuth Settings

Google OAuth requires both **Authorized JavaScript origins** and **Authorized redirect URIs** to be pre-registered.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID

#### 1.2.1 Add Authorized JavaScript Origins

**Important**: Google does **NOT** support wildcards in Authorized JavaScript origins. You have a few options:

**Recommended: Use Single Deploy Domain (Path-Based Routing)**

With path-based PR previews, all PRs share the same domain (`deploy.beakerstack.com`). You only need to add:

```
https://deploy.beakerstack.com
```

**Alternative: Verify if Supabase Origin is Used**

When using Supabase's OAuth SDK, the JavaScript origin that Google sees might actually be your Supabase project URL rather than your deploy domain. Test this first - if OAuth works without adding the deploy domain to Authorized JavaScript origins, you don't need to add it.

**To test**: Try signing in with Google on a preview URL (e.g., `https://deploy.beakerstack.com/pr-1/`). If it works, you don't need to add the deploy domain to Authorized JavaScript origins. If you get an error about unauthorized origin, you'll need to add it.

**Current domains you likely already have:**

```
http://localhost:5173
https://your-production-domain.com
```

#### 1.2.2 Add Authorized Redirect URIs

Under **Authorized redirect URIs**, add:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

Replace `<your-project-ref>` with your actual Supabase project reference ID.

Example:

```
https://pvavpnumwsgzapfhziag.supabase.co/auth/v1/callback
```

**Important**: Google doesn't support wildcard redirect URLs, but you only need to add the Supabase callback URL. Each preview path (`deploy.beakerstack.com/pr-9/`, `deploy.beakerstack.com/pr-10/`, etc.) will redirect through Supabase's callback URL, which then redirects to your app. As long as the Supabase callback URL is registered, all preview paths will work for the redirect.

4. Click **Save** at the bottom of the page

### 1.3 How OAuth Flow Works

```
User clicks "Sign in with Google" on deploy.beakerstack.com/pr-9/
  ↓
Redirects to Google
  ↓
Google redirects to: https://<project-ref>.supabase.co/auth/v1/callback
  ↓
Supabase redirects to: https://deploy.beakerstack.com/pr-9/auth/callback
```

## Step 2: Configure Site URL

The site URL is used by Supabase to:

- Generate email confirmation links
- Validate redirect URLs after OAuth
- Construct callback URLs

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Under **Site URL**, set:

   ```
   https://deploy.<your-domain>
   ```

   Replace `<your-domain>` with your actual domain (e.g., `beakerstack.com`).

   Example:

   ```
   https://deploy.beakerstack.com
   ```

**Note**: With path-based routing, all PR previews share the same deploy domain, so you only need to configure the site URL once. The site URL is used as a base for email confirmation links and OAuth callbacks.

## Step 3: Configure Redirect URLs

Supabase needs to know which URLs are allowed for OAuth redirects.

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add the following patterns:

   ```
   https://deploy.<your-domain>/pr-*/auth/callback
   https://deploy.<your-domain>/pr-*/**
   https://deploy.<your-domain>/**
   ```

   Replace `<your-domain>` with your actual domain (e.g., `beakerstack.com`).

   **Example for beakerstack.com:**

   ```
   https://deploy.beakerstack.com/pr-*/auth/callback
   https://deploy.beakerstack.com/pr-*/**
   https://deploy.beakerstack.com/**
   ```

4. Click **Save**

**Important**: Supabase supports wildcard patterns (`*`) in paths. The `**` pattern matches all paths recursively. The patterns above cover:

- Individual PR callback paths: `/pr-123/auth/callback`
- All paths within a PR: `/pr-123/**`
- All paths on the deploy domain: `/**` (catch-all for any path)

## Step 4: Disable Email Confirmation

For preview environments, email confirmation can be cumbersome since emails may go to spam or require manual checking. It's recommended to disable email confirmation for previews.

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication** → **Email Auth**
3. Under **Email Confirmation**, toggle the switch to **Disable** email confirmation
4. Click **Save**

**Note**: This means users signing up on preview environments will not need to confirm their email before signing in. This is acceptable for preview/testing environments but should remain enabled in production.

## Step 5: Verify Configuration

After completing the above steps, verify your configuration:

1. **Check Google OAuth**:
   - Go to **Authentication** → **Providers**
   - Verify Google provider is enabled (green toggle)
   - Verify Client ID and Secret are saved

2. **Check Site URL**:
   - Go to **Authentication** → **URL Configuration**
   - Verify Site URL is set to a valid preview domain

3. **Check Redirect URLs**:
   - Go to **Authentication** → **URL Configuration**
   - Verify redirect URLs include your preview domain patterns

4. **Check Email Confirmation**:
   - Go to **Authentication** → **Email Auth**
   - Verify "Confirm email" is disabled

## Testing the Configuration

### Test Google OAuth

1. Deploy a preview using the PR workflow (or manually)
2. Visit the preview URL (e.g., `https://deploy.beakerstack.com/pr-9/`)
3. Try signing in with Google
4. Verify the OAuth flow completes successfully
5. Check that you're redirected back to the preview path (e.g., `https://deploy.beakerstack.com/pr-9/auth/callback`)

### Test Email Sign-up

1. Visit the preview URL
2. Sign up with a new email address
3. Verify you can sign in immediately (no email confirmation required)
4. If email confirmation is still enabled, check your email and verify the confirmation link works

### Troubleshooting OAuth Errors

If you see errors like `"Unsupported provider: provider is not enabled"`:

- Verify Google provider is enabled in Supabase dashboard
- Check that Client ID and Secret are correctly entered
- Verify the Supabase callback URL is added to Google Cloud Console
- Check browser console for detailed error messages

If OAuth redirects fail:

- Verify redirect URLs are correctly configured in Supabase
- Check that the site URL matches your preview domain pattern
- Ensure the preview domain is accessible (not blocked by firewall/VPN)

## Updating Configuration Per PR

**Note**: With path-based routing, you don't need to update the site URL for each PR. The site URL is set to `https://deploy.beakerstack.com` and works for all PR previews since they all share the same domain.

## Maintenance

### Rotating Credentials

If you need to rotate Google OAuth credentials:

1. Generate new credentials in Google Cloud Console
2. Update Supabase dashboard → **Authentication** → **Providers** → **Google**
3. Update Client ID and Secret
4. Update Google Cloud Console with the same credentials
5. Test OAuth flow on a preview

### Updating Redirect URLs

If you change your preview domain:

1. Update redirect URLs in Supabase dashboard
2. Update redirect URLs in Google Cloud Console (if needed)
3. Update site URL in Supabase dashboard
4. Verify configuration with a test preview

## References

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/url-configuration)
- [Email Auth Settings](https://supabase.com/docs/guides/auth/auth-email)
