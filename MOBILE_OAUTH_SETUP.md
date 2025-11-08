# Mobile OAuth Setup Guide

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

- Solution: Verify `scheme: "beaker-stack"` is configured in your Expo app (`app.config.ts` or `app.json`)
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
