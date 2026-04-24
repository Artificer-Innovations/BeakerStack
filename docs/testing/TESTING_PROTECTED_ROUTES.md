# Testing Protected Routes

This document describes how to manually verify that protected routes work correctly on both web and mobile platforms.

## Mobile Testing (iOS & Android)

### Test 1: Unauthenticated User Redirect

**Goal**: Verify that unauthenticated users are automatically redirected from Dashboard to Login.

**Steps**:

1. **Sign out** if you're currently signed in (go to Dashboard → Sign Out)
2. **Ensure you're signed out** - navigate to Home screen and verify no user info is shown
3. **Navigate to Dashboard** - either:
   - Tap a "Dashboard" button/link if available on Home screen
   - Or manually navigate using React Navigation (if you have a direct navigation button)
   - Or use the Expo dev menu: Shake device → "Debug" → navigate programmatically

**Expected Result**:

- You should briefly see a "Redirecting..." message with a loading spinner
- You should be automatically redirected to the Login screen
- You should NOT see the Dashboard content

### Test 2: Authenticated User Access

**Goal**: Verify that authenticated users can access Dashboard without being redirected.

**Steps**:

1. **Sign in** - Go to Login screen and sign in with valid credentials
2. **Navigate to Dashboard** (should happen automatically after successful login)
3. **Verify Dashboard loads** - You should see:
   - "Welcome to your Dashboard!" title
   - Your email address
   - Dashboard content
   - Sign Out button

**Expected Result**:

- Dashboard screen loads completely
- No redirect to Login
- Dashboard content is visible

### Test 3: Session Persistence

**Goal**: Verify that authenticated sessions persist across app reloads.

**Steps**:

1. **Sign in** and navigate to Dashboard
2. **Reload the app**:
   - iOS: Press Cmd+R in Metro bundler or shake device → "Reload"
   - Android: Press R in Metro bundler or shake device → "Reload"
3. **Observe initial load**:
   - You might briefly see "Loading..." while auth state is checked
   - Then Dashboard should appear (no redirect to Login)

**Expected Result**:

- After reload, you remain on Dashboard (if you were there)
- Or you're on the last screen you were on
- No unexpected redirect to Login

### Test 4: Direct Navigation to Dashboard (Unauthenticated)

**Goal**: Verify protection works even when trying to navigate directly to Dashboard.

**Steps**:

1. **Ensure you're signed out**
2. **Try to navigate directly to Dashboard**:
   - Use React Navigation programmatically (if you have dev tools)
   - Or use Expo dev menu to navigate
   - Or if you have a deep link, use that

**Expected Result**:

- Brief "Loading..." or "Redirecting..." message
- Automatic redirect to Login screen
- Dashboard content is never shown

### Test 5: Auth State Change Handling

**Goal**: Verify that signing out from Dashboard redirects properly.

**Steps**:

1. **Sign in** and navigate to Dashboard
2. **Sign out** from Dashboard (tap Sign Out button)
3. **Observe behavior**

**Expected Result**:

- Sign out succeeds
- You're redirected to Home screen (based on current implementation)
- If you try to navigate back to Dashboard, you should be redirected to Login

## Web Testing

### Test 1: Unauthenticated User Redirect

**Steps**:

1. Sign out if signed in
2. Navigate directly to `http://localhost:5173/dashboard` (or your web URL)

**Expected Result**:

- Brief "Loading..." message
- Automatic redirect to `/login`
- Dashboard page content is never shown

### Test 2: Authenticated User Access

**Steps**:

1. Sign in through Login page
2. Navigate to Dashboard (should happen automatically)

**Expected Result**:

- Dashboard page loads completely
- No redirect to Login
- Dashboard content is visible

## Verification Checklist

- [ ] Unauthenticated users cannot access Dashboard on mobile
- [ ] Unauthenticated users cannot access Dashboard on web
- [ ] Authenticated users can access Dashboard on mobile
- [ ] Authenticated users can access Dashboard on web
- [ ] Loading states show correctly ("Loading..." / "Redirecting...")
- [ ] Session persists across app reloads
- [ ] Direct navigation to Dashboard when unauthenticated redirects to Login

## Common Issues to Watch For

1. **Blank Screen**: If you see a blank screen instead of redirecting, check:
   - Metro bundler console for errors
   - React Native debugger for JavaScript errors
   - Verify auth state is loading correctly

2. **Infinite Redirect Loop**: If you get stuck in a redirect loop:
   - Check that Login screen is not also protected
   - Verify redirect target exists in navigation stack

3. **No Redirect**: If unauthenticated users can still see Dashboard:
   - Check that auth context is working
   - Verify useEffect is running
   - Check navigation prop is available
