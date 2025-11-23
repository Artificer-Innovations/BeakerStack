# Mobile Build Testing Guide

This guide explains how to install and test mobile builds (PR previews, staging, and production) from Expo EAS.

## Overview

Our mobile app uses **Expo EAS Updates** for over-the-air (OTA) JavaScript updates and **EAS Build** for full native builds. Each environment has its own channel:

- **PR Previews**: Channel `pr-{number}` (e.g., `pr-17`)
- **Staging**: Channel `staging`
- **Production**: Channel `production`

## Important: Development Build Required

⚠️ **Our app includes native modules (Google OAuth), so Expo Go will NOT work.**

You must use a **Development Build** (also called a "custom dev client") which:

- Includes all your native modules (Google OAuth, etc.)
- Still supports OTA updates via EAS Updates
- Can be installed on simulators, emulators, or physical devices

## Prerequisites

1. **Expo Account Access**: You need access to the `artificer-innovations-llc` organization on Expo
2. **Development Build** installed on your device/simulator (see below)
3. **Physical Device or Simulator/Emulator**

## Step 1: Create Your First Development Build

You only need to do this **once** (or when native dependencies change). After that, you can use OTA updates.

### Easy Method: Use npm Scripts

**For iOS Simulator:**

```bash
# Build in the cloud (recommended, takes ~10-15 minutes)
npm run mobile:build:dev:ios

# Or build locally (faster but requires Xcode and Fastlane setup)
# Install Fastlane first: sudo gem install fastlane
npm run mobile:build:dev:ios:local
```

**For Android Emulator:**

```bash
# Build in the cloud (recommended, takes ~10-15 minutes)
npm run mobile:build:dev:android

# Or build locally (faster but requires Android SDK setup)
npm run mobile:build:dev:android:local
```

After the build completes:

**For Local Builds (easiest):**

```bash
# iOS - automatically finds and installs the latest local build
npm run mobile:install:dev:ios:local

# For Android, download the .apk and use:
EAS_BUILD_PATH=path/to/BeakerStack.apk npm run mobile:install:dev:android
```

**For Cloud Builds:**

1. **Download the build** from [Expo dashboard](https://expo.dev/accounts/artificer-innovations-llc/projects/beaker-stack/builds) (filter by "development" profile)
2. **Install on simulator/emulator**:

   ```bash
   # iOS
   EAS_BUILD_PATH=~/Downloads/BeakerStack.ipa npm run mobile:install:dev:ios

   # Android
   EAS_BUILD_PATH=~/Downloads/BeakerStack.apk npm run mobile:install:dev:android
   ```

### Manual Method (Alternative)

If you prefer to run commands directly:

**For iOS Simulator:**

```bash
cd apps/mobile
npx eas build --platform ios --profile development
# Then download and install manually
```

**For Android Emulator:**

```bash
cd apps/mobile
npx eas build --platform android --profile development
# Then download and install manually
```

### Install on Physical Device

- **iOS**: Use TestFlight or Xcode (see "Install on iOS Physical Device" section below)
- **Android**: Use ADB or Play Store internal testing

## Step 2: Load PR Preview Updates

Once you have the development build installed, you can load OTA updates from any channel:

### Method 1: Via Update URL (Recommended)

1. **Open the development build** on your device/simulator
2. **Shake the device** (or press `Cmd+D` on iOS simulator / `Cmd+M` on Android emulator)
3. **Tap "Enter URL manually"** or "Open from URL"
4. **Enter the update URL** in this format:

   ```
   https://u.expo.dev/{PROJECT_ID}?channel-name={CHANNEL_NAME}
   ```

   For example:

   ```
   https://u.expo.dev/23c5e522-5341-4342-85f5-f2e46dd6087f?channel-name=pr-17
   ```

5. The app will reload with the JavaScript bundle from that channel

**Finding Your Project ID (for template repos):**

The URL format is: `https://u.expo.dev/{PROJECT_ID}?channel-name={CHANNEL_NAME}`

To find your project ID:

1. Check `apps/mobile/.eas/project.json` → `projectId` field (most reliable)
2. Check `apps/mobile/app.config.ts` → `extra.eas.projectId` field
3. Run: `cd apps/mobile && npx eas project:info` and look for the `id` field
4. Visit your Expo dashboard and check the project settings

**Important Notes:**

- The web dashboard URL (`https://expo.dev/.../updates/pr-17`) is for viewing updates in the browser, not for loading in the dev client
- Just entering the channel name (e.g., `pr-17`) will not work - you need the full URL format
- The PR comment will automatically include the correct URL for you to copy

### Method 2: Via Expo CLI (Local Development)

```bash
cd apps/mobile
npx expo start --dev-client
```

Then in the development build:

- Scan the QR code, or
- Press `i` for iOS simulator / `a` for Android emulator

**Note:** This connects to your local development server, not a PR preview channel. To load PR preview updates, use Method 1 above.

## Alternative: Full Production-Like Builds

If you prefer to test with a full build (no OTA updates), you can build with the preview/staging/production profiles. These builds include the JavaScript bundle baked in and don't support OTA updates.

### Building Preview/Staging/Production Builds

Builds are automatically created by CI/CD, but you can also build manually:

```bash
cd apps/mobile

# For PR preview (uses preview Supabase)
EXPO_TOKEN=your-token npx eas build --platform ios --profile preview
EXPO_TOKEN=your-token npx eas build --platform android --profile preview

# For staging
EXPO_TOKEN=your-token npx eas build --platform ios --profile staging
EXPO_TOKEN=your-token npx eas build --platform android --profile staging

# For production
EXPO_TOKEN=your-token npx eas build --platform ios --profile production
EXPO_TOKEN=your-token npx eas build --platform android --profile production
```

### Step 2: Download the Build

1. **View Builds**:

   ```bash
   npx eas build:list --limit 10
   ```

2. **Download from Expo Dashboard**:
   - Visit: https://expo.dev/accounts/artificer-innovations-llc/projects/beaker-stack/builds
   - Find your build and click "Download"
   - iOS: Downloads as `.ipa` file
   - Android: Downloads as `.aab` (Play Store) or `.apk` (internal testing)

### Step 3: Install on iOS Simulator

1. **Boot a Simulator**:

   ```bash
   open -a Simulator
   # Or select a specific device:
   xcrun simctl boot "iPhone 15 Pro"
   ```

2. **Install the .ipa**:

   ```bash
   xcrun simctl install booted ~/Downloads/BeakerStack.ipa
   ```

3. **Launch the App**:

   ```bash
   xcrun simctl launch booted com.anonymous.beakerstack
   ```

   Or find "Beaker Stack" in the Simulator and tap it.

### Step 4: Install on iOS Physical Device

1. **Via TestFlight** (Recommended):
   - Upload the `.ipa` to App Store Connect using [Transporter](https://apps.apple.com/us/app/transporter/id1450874784) or:
     ```bash
     npx eas submit --platform ios --profile production
     ```
   - Wait for processing (usually 10-30 minutes)
   - Add testers in TestFlight
   - Install via TestFlight app on your device

2. **Via Xcode** (Development):
   - Open Xcode
   - Window → Devices and Simulators
   - Select your device
   - Drag and drop the `.ipa` file
   - Trust the developer certificate on your device (Settings → General → VPN & Device Management)

### Step 5: Install on Android Emulator

1. **Boot an Emulator**:

   ```bash
   # List available emulators
   emulator -list-avds

   # Start an emulator
   emulator -avd Pixel_5_API_33
   ```

2. **Install the APK**:

   ```bash
   adb install ~/Downloads/BeakerStack.apk
   ```

3. **Launch the App**:

   ```bash
   adb shell monkey -p com.anonymous.beakerstack 1
   ```

   Or find "Beaker Stack" in the app drawer and tap it.

**Note**: If you only have an `.aab` file (Play Store bundle), you need to either:

- Build with `buildType: "apk"` in the profile, or
- Convert the `.aab` to `.apk` using [bundletool](https://github.com/google/bundletool)

### Step 6: Install on Android Physical Device

1. **Via Google Play Internal Testing** (Recommended):
   - Upload the `.aab` to Play Console:
     ```bash
     npx eas submit --platform android --profile production
     ```
   - Add testers in Play Console → Internal testing
   - Install via Play Store on your device

2. **Via ADB** (Development):
   - Enable "Developer options" and "USB debugging" on your device
   - Connect via USB
   - Install:
     ```bash
     adb install ~/Downloads/BeakerStack.apk
     ```

3. **Via Direct Install**:
   - Transfer the `.apk` to your device
   - Open the file and allow installation from unknown sources
   - Install

## Testing Different Environments

### PR Preview Builds

- **Channel**: `pr-{number}` (e.g., `pr-17`)
- **Supabase**: Preview database (shared across PRs)
- **Purpose**: Test PR-specific changes before merge

**To Test**:

1. Find the PR comment with the mobile preview link
2. Follow Option 1 (OTA) or Option 2 (Full Build) above
3. The app will connect to the preview Supabase instance

### Staging Builds

- **Channel**: `staging`
- **Supabase**: Staging database
- **Purpose**: Test changes before production release

**To Test**:

1. Build with `--profile staging` or use the staging channel
2. Install using Option 2 above
3. The app will connect to the staging Supabase instance

### Production Builds

- **Channel**: `production`
- **Supabase**: Production database
- **Purpose**: Final release to users

**To Test**:

1. Build with `--profile production`
2. Install via TestFlight (iOS) or Play Store Internal Testing (Android)
3. The app will connect to the production Supabase instance

## Troubleshooting

### "Update not found" or "Channel doesn't exist"

- Verify the channel name matches exactly (case-sensitive)
- Check that the update was published successfully in the Expo dashboard
- Ensure you're signed in to the correct Expo account

### "Cannot install on simulator"

- iOS: Make sure the `.ipa` is built for simulator (not device). Use `--profile preview` which builds for both.
- Android: Use an `.apk` file, not `.aab` for emulator installation

### "App crashes on launch"

- Check that the build profile matches the environment (preview/staging/production)
- Verify Supabase credentials are correctly configured in the build
- Check Expo dashboard for crash logs

### "Google OAuth doesn't work"

- Ensure you're using a **full native build** (not Expo Go)
- Verify Google OAuth credentials are configured in the build profile
- Check that redirect URLs match in Google Console and Supabase

### "Can't find the build in Expo dashboard"

- Verify you're looking at the correct organization: `artificer-innovations-llc`
- Check the project: `beaker-stack`
- Filter by platform (iOS/Android) and profile (preview/staging/production)

## Quick Reference

### npm Scripts (Recommended)

```bash
# Build development client (cloud)
npm run mobile:build:dev:ios          # iOS
npm run mobile:build:dev:android      # Android

# Build development client (local, faster)
npm run mobile:build:dev:ios:local    # iOS
npm run mobile:build:dev:android:local # Android

# Install development build on simulator/emulator
EAS_BUILD_PATH=~/Downloads/BeakerStack.ipa npm run mobile:install:dev:ios
EAS_BUILD_PATH=~/Downloads/BeakerStack.apk npm run mobile:install:dev:android

# Start dev server (after installing dev build)
npm run mobile                        # Start Metro bundler
# Then in dev client: shake device → "Enter URL manually" → paste update URL
```

### EAS CLI Commands

```bash
# List recent builds
npx eas build:list

# View specific build
npx eas build:view <BUILD_ID>

# List updates on a channel
npx eas update:list --channel pr-17

# View update details
npx eas update:view <UPDATE_ID>
```

### Useful Links

- **Expo Dashboard**: https://expo.dev/accounts/artificer-innovations-llc/projects/beaker-stack
- **Builds**: https://expo.dev/accounts/artificer-innovations-llc/projects/beaker-stack/builds
- **Updates**: https://expo.dev/accounts/artificer-innovations-llc/projects/beaker-stack/updates
