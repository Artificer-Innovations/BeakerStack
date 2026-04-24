# OAuth Testing Guide

This guide explains how to test the OAuth implementation in the web app.

---

## Overview

The web app now supports three authentication methods:

1. **Email/Password** (fully functional)
2. **Google OAuth** (requires setup)
3. **Apple OAuth** (requires setup)

---

## Prerequisites

- Local Supabase running: `supabase start`
- Web app running: `cd apps/web && npm run dev`
- Browser (Chrome/Firefox/Safari recommended)

---

## Testing Email/Password Authentication (No Setup Required)

### Test Sign Up

1. Navigate to `http://localhost:5173/signup`
2. You should see:
   - "Sign up with Google" button (white with Google logo)
   - "Sign up with Apple" button (black with Apple logo)
   - "Or continue with email" divider
   - Email input field
   - Password input field
   - Confirm password input field
   - "Create account" button

3. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm password: `password123`

4. Click "Create account"

5. **Expected Result**:
   - Button shows "Creating account..." while loading
   - Redirects to `/dashboard`
   - User is logged in

### Test Sign In

1. Navigate to `http://localhost:5173/login`
2. You should see:
   - "Sign in with Google" button
   - "Sign in with Apple" button
   - "Or continue with email" divider
   - Email and password fields
   - "Sign in" button

3. Fill in the form with the account you just created:
   - Email: `test@example.com`
   - Password: `password123`

4. Click "Sign in"

5. **Expected Result**:
   - Button shows "Signing in..." while loading
   - Redirects to `/dashboard`
   - User is logged in

### Test Sign Out

1. While logged in, navigate to `/dashboard`
2. Click the "Sign Out" button
3. **Expected Result**:
   - Redirects to home page
   - User is logged out

---

## Testing OAuth (Requires Setup)

### Without OAuth Credentials (Current State)

1. Navigate to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. **Expected Result**:
   - Button shows "Connecting..." briefly
   - Error message appears: "OAuth provider not configured" or similar
   - Error is displayed in red box
   - User remains on login page

This is **expected behavior** until OAuth credentials are configured.

### With OAuth Credentials (After Setup)

Follow the setup instructions in [OAuth setup for production](../oauth/OAUTH_SETUP.md) first, then:

#### Test Google OAuth

1. Navigate to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. **Expected Flow**:
   - Button shows "Connecting..."
   - Opens Google login popup/redirect
   - User selects Google account
   - User grants permissions
   - Redirects to `http://localhost:5173/auth/callback`
   - Shows "Completing sign in..." spinner
   - Redirects to `/dashboard`
   - User is logged in

4. **Verify in Supabase**:
   - Open Supabase Studio: `http://localhost:54323`
   - Go to "Authentication" → "Users"
   - You should see the new user with:
     - Email from Google account
     - Provider: `google`
     - Last sign in timestamp

5. **Verify in App**:
   - Check the debug UI on home page
   - Should show:
     - `loading: false`
     - `user: [object with Google user data]`
     - `session: [object with session data]`
     - `error: null`

#### Test Apple OAuth

1. Navigate to `http://localhost:5173/login`
2. Click "Sign in with Apple"
3. **Expected Flow**:
   - Button shows "Connecting..."
   - Opens Apple login popup/redirect
   - User enters Apple ID and password
   - User grants permissions
   - Redirects to `http://localhost:5173/auth/callback`
   - Shows "Completing sign in..." spinner
   - Redirects to `/dashboard`
   - User is logged in

4. **Verify in Supabase**:
   - Open Supabase Studio
   - Go to "Authentication" → "Users"
   - You should see the new user with:
     - Email from Apple account (or private relay email)
     - Provider: `apple`

---

## Testing OAuth Error Handling

### Test OAuth Cancellation

1. Click "Sign in with Google"
2. In the Google popup, click "Cancel" or close the window
3. **Expected Result**:
   - Redirects back to login page
   - May show error message
   - User remains logged out

### Test OAuth Permission Denial

1. Click "Sign in with Google"
2. In the Google popup, deny permissions
3. **Expected Result**:
   - Redirects to `/auth/callback`
   - Shows error message: "Authentication Error"
   - Shows error description
   - Shows "Redirecting to login page..."
   - After 3 seconds, redirects to `/login`

---

## Testing UI/UX

### Test Loading States

1. **Email/Password Loading**:
   - Fill in login form
   - Click "Sign in"
   - Button should show "Signing in..."
   - Button should be disabled
   - Input fields should be disabled

2. **OAuth Loading**:
   - Click "Sign in with Google"
   - Button should show "Connecting..."
   - Button should be disabled
   - Should prevent multiple clicks

### Test Error Display

1. **Invalid Credentials**:
   - Enter wrong email/password
   - Click "Sign in"
   - Error should appear in red box above form
   - Error message should be clear

2. **Password Mismatch (Signup)**:
   - Go to signup page
   - Enter different passwords
   - Click "Create account"
   - Error should appear: "Passwords do not match"

3. **Empty Fields**:
   - Leave fields empty
   - Click "Sign in"
   - Error should appear: "Please fill in all fields"

### Test Button Styling

1. **Google Button**:
   - White background
   - Gray text
   - Google logo (colorful)
   - Hover effect (light gray)

2. **Apple Button**:
   - Black background
   - White text
   - Apple logo (white)
   - Hover effect (dark gray)

3. **Email Button**:
   - Primary color background
   - White text
   - Hover effect (darker primary)

---

## Testing Redirect Flow

### Test Auth Callback Page

1. Manually navigate to `http://localhost:5173/auth/callback`
2. **Expected Result**:
   - Shows "Completing sign in..." spinner
   - If not authenticated, stays on spinner
   - If authenticated, redirects to `/dashboard`

### Test Protected Routes

1. While logged out, try to access `/dashboard`
2. **Current Behavior**: Can access (no protection yet)
3. **Future Behavior**: Should redirect to `/login`

---

## Testing Across Browsers

Test the authentication flow in:

- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

**Known Issues**:

- OAuth popups may be blocked by default (user must allow)
- Private/Incognito mode may have different behavior
- Safari may have stricter cookie policies

---

## Testing Mobile Responsiveness

1. Open browser dev tools
2. Toggle device toolbar (mobile view)
3. Test on various screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1024px+)

4. **Verify**:
   - Buttons are full width on mobile
   - Text is readable
   - Spacing is appropriate
   - No horizontal scroll

---

## Automated Tests

### Run Unit Tests

```bash
# All tests
npm test

# Web tests only
cd apps/web && npm test

# Specific test file
cd apps/web && npm test -- src/components/__tests__/SocialLoginButton.test.tsx
```

### Test Coverage

```bash
cd apps/web && npm test -- --coverage
```

**Expected Coverage**:

- `SocialLoginButton.tsx`: 100%
- `LoginPage.tsx`: High (>80%)
- `SignupPage.tsx`: High (>80%)
- `AuthCallbackPage.tsx`: High (>80%)

---

## Troubleshooting

### OAuth Buttons Don't Work

**Symptom**: Clicking OAuth buttons does nothing or shows error

**Possible Causes**:

1. OAuth not configured in Supabase
   - **Fix**: Follow [../oauth/OAUTH_SETUP.md](../oauth/OAUTH_SETUP.md)
2. Redirect URL mismatch
   - **Fix**: Ensure redirect URLs match in Google/Apple console and Supabase
3. Popup blocked
   - **Fix**: Allow popups for localhost

### Redirect Loop

**Symptom**: After OAuth, page keeps redirecting

**Possible Causes**:

1. Session not being saved
   - **Fix**: Check browser console for errors
   - **Fix**: Verify Supabase client is configured correctly
2. Auth state not updating
   - **Fix**: Check `useAuth` hook is properly subscribed to auth changes

### Error: "Invalid redirect URL"

**Symptom**: OAuth fails with redirect URL error

**Possible Causes**:

1. Redirect URL not whitelisted in OAuth provider
   - **Fix**: Add `http://localhost:5173/auth/callback` to allowed URLs
2. Redirect URL not matching exactly
   - **Fix**: Ensure no trailing slashes or extra parameters

### User Not Created in Database

**Symptom**: OAuth succeeds but user not in `user_profiles` table

**Possible Causes**:

1. Trigger not firing
   - **Fix**: Check `supabase/migrations/20241020000001_create_user_profiles.sql`
   - **Fix**: Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. RLS blocking insert
   - **Fix**: Check RLS policies on `user_profiles` table

---

## Next Steps

After testing OAuth:

1. ✅ Verify all unit tests pass
2. ✅ Test email/password authentication
3. ⏸️ Configure OAuth credentials (see [../oauth/OAUTH_SETUP.md](../oauth/OAUTH_SETUP.md))
4. ⏸️ Test OAuth authentication with real credentials
5. ⏸️ Implement mobile OAuth (Task 3.4)
6. ⏸️ Add protected routes
7. ⏸️ Add session persistence
8. ⏸️ Add "Remember me" functionality

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs in Studio
3. Verify environment variables are set
4. Review [../oauth/OAUTH_SETUP.md](../oauth/OAUTH_SETUP.md) for configuration
5. Check `packages/shared/src/hooks/useAuth.ts` for auth logic

**Common Gotchas**:

- Redirect URLs must match EXACTLY (including protocol, port, path)
- OAuth providers may cache credentials (clear cache if issues persist)
- Localhost may behave differently than production
- Some OAuth providers don't work on localhost (use ngrok for testing)
