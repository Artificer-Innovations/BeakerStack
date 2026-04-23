# Quick OAuth Setup Guide

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
