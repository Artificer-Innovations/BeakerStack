# Real-time Development Setup

This guide explains how to test real-time profile updates across multiple devices (web, iOS, Android) during local development.

## Overview

Real-time features work great on a single device using `localhost`, but testing across multiple devices (e.g., web + iOS + Android simultaneously) requires all devices to connect to the same Supabase instance. Since mobile devices can't reach `localhost` on your computer, we use **[nip.io](https://nip.io)** - a free wildcard DNS service that maps your local IP address to a valid hostname.

**Why nip.io?**

- Maps any IP to a hostname: `192-168-0-196.nip.io` → `192.168.0.196`
- Works without modifying `/etc/hosts` or DNS settings
- OAuth providers (like Google) accept it as a valid domain
- Allows all devices on your network to connect to the same Supabase instance

**Example:** Instead of accessing your web app at `http://localhost:5173`, you'll use `http://beaker-stack-192-168-0-196.nip.io:5173`, which is accessible from all devices on your network.

**Note:** We use HTTP (not HTTPS) for multi-device development because local Supabase runs on HTTP. Using HTTPS for the web app would cause mixed content errors when connecting to the HTTP Supabase API.

## Quick Start (Single Device)

For development on a single device (localhost), no special configuration is needed. The default setup works out of the box.

## Multi-Device Testing

To test real-time synchronization across multiple devices on your local network:

### 1. Find Your Local IP Address

**macOS:**

```bash
ipconfig getifaddr en0  # WiFi
# or
ipconfig getifaddr en1  # Ethernet
```

**Linux:**

```bash
hostname -I | awk '{print $1}'
```

**Windows:**

```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

### 2. Configure Environment Variables

Create or update your `.env.local` files with your nip.io hostname:

**Root `.env.local`:**

```bash
# Site URL for OAuth redirects (use full HTTP URL with port)
SUPABASE_AUTH_SITE_URL=http://beaker-stack-192-168-0-196.nip.io:5173
# Additional redirect URL for Supabase OAuth
SUPABASE_ADDITIONAL_REDIRECT_URL=http://beaker-stack-192-168-0-196.nip.io:5173
```

**For Web (`apps/web/.env.local`):**

```bash
# Just the hostname (no http:// or port)
VITE_DEV_HOST=beaker-stack-192-168-0-196.nip.io
VITE_SUPABASE_URL=http://beaker-stack-192-168-0-196.nip.io:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**For Mobile (`apps/mobile/.env.local`):**

```bash
EXPO_PUBLIC_SUPABASE_URL=http://beaker-stack-192-168-0-196.nip.io:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Replace `192-168-0-196` with your actual IP address (replace dots with dashes).

### 3. Supabase Configuration (Already Done!)

The `supabase/config.toml` is already configured to read your nip.io URL from the environment variable:

```toml
additional_redirect_urls = [
  # ... other URLs ...
  "env(SUPABASE_ADDITIONAL_REDIRECT_URL)",  # Reads from your .env.local
  # ... other URLs ...
]
```

No manual editing of `config.toml` is needed! The redirect URL you set in step 2 will be automatically picked up by Supabase.

### 4. Rebuild iOS App (if using iOS)

The iOS App Transport Security (ATS) exception is automatically configured based on your `EXPO_PUBLIC_SUPABASE_URL`. When you use an HTTP nip.io domain, the ATS exception is added automatically.

**Important:** After changing environment variables, you must rebuild the iOS app:

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:ios
```

The app config will automatically detect the nip.io domain from your `.env.local` and add the necessary ATS exception.

### 5. Update OAuth Configuration (if using Google/Apple Sign-In)

In your Google Cloud Console (or Apple Developer Console), add the nip.io URLs:

**Authorized JavaScript origins:**

```
http://localhost:5173
http://beaker-stack-192-168-0-196.nip.io:5173
```

**Authorized redirect URIs (Supabase callback URLs):**

```
http://127.0.0.1:54321/auth/v1/callback
http://localhost:54321/auth/v1/callback
http://beaker-stack-192-168-0-196.nip.io:54321/auth/v1/callback
```

**Important:**

- Use `http://` (not `https://`) to match your local setup
- The redirect URIs point to Supabase (port 54321), not your web app (port 5173)
- OAuth changes may take 5-10 minutes to propagate

### 6. Restart Services

```bash
# Restart Supabase
supabase stop
supabase start

# Restart web dev server
cd apps/web
npm run dev

# Restart mobile dev server
cd apps/mobile
npm start -- --clear
```

### 7. Access Your Apps

- **Web:** Open `http://beaker-stack-192-168-0-196.nip.io:5173` in your browser
- **Mobile:** The Expo app will automatically connect to the correct URL from your `.env.local`

## Testing Real-time Updates

1. Sign in with the same user account on multiple devices
2. Navigate to the Profile page on all devices
3. Update the profile (display name, bio, etc.) on one device
4. Watch the changes appear instantly on all other devices!

## Troubleshooting

### WebSocket Connection Fails

Check that:

- All devices are on the same network
- Your firewall allows connections on ports 54321 and 5173
- The `SUPABASE_URL` environment variables match across all apps
- Supabase is running: `supabase status`

### iOS "Network request failed"

- The NSAppTransportSecurity exception is automatically added when using HTTP nip.io URLs
- Rebuild the iOS app after changing environment variables: `npx expo prebuild --clean && npx expo run:ios`
- Verify your `.env.local` has `EXPO_PUBLIC_SUPABASE_URL` with the nip.io domain
- The ATS exception only applies to valid hostnames (not raw IP addresses)

### OAuth Redirect Issues

- Always open the web app at the nip.io URL, not localhost
- Wait 5-10 minutes after updating OAuth settings in Google Cloud Console
- Ensure the redirect URL in GCP exactly matches your nip.io URL

### Real-time Updates Not Syncing

Check the browser/app console for:

```
[ProfileRealtimeRegistry] Creating new channel for user: <user-id>
[ProfileRealtimeRegistry] Channel status for user <user-id>: SUBSCRIBED
```

If you see `CLOSED` instead of `SUBSCRIBED`, check your Supabase connection.

## Why nip.io?

[nip.io](https://nip.io) is a wildcard DNS service that maps any IP address to a valid hostname:

- `192-168-0-196.nip.io` → `192.168.0.196`
- Works without modifying `/etc/hosts`
- Allows OAuth providers to accept the URL (they reject raw IP addresses)
- Enables secure WebSocket connections across devices

## How Automatic iOS ATS Configuration Works

The `apps/mobile/app.config.ts` automatically detects when you're using an HTTP nip.io domain and adds the necessary iOS App Transport Security exception:

1. It reads `EXPO_PUBLIC_SUPABASE_URL` from your `.env.local`
2. If the URL uses `http://` with a valid hostname (not localhost or raw IP), it extracts the domain
3. It dynamically adds an `NSAppTransportSecurity` exception for that domain
4. When you rebuild the iOS app, the exception is baked into the native config

This means:

- ✅ No manual plist editing required
- ✅ Developer-specific domains stay in `.env.local` (not committed)
- ✅ Production builds automatically use HTTPS (no ATS exception)
- ✅ Switching between localhost and nip.io just requires changing `.env.local` and rebuilding

## Reverting to Localhost

To go back to single-device development:

1. Remove or comment out `VITE_DEV_HOST` from `apps/web/.env.local`
2. Set `VITE_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_URL` back to `http://localhost:54321`
3. Set `SUPABASE_AUTH_SITE_URL` in root `.env.local` back to `http://localhost:5173`
4. Remove `SUPABASE_ADDITIONAL_REDIRECT_URL` from root `.env.local` (or set it to empty)
5. Restart your dev servers

## Security Note

The NSAppTransportSecurity exception and HTTP connections are **only for local development**. Production builds should always use HTTPS and remove these exceptions.
