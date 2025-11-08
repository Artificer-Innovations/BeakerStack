#!/bin/bash
# Script to do a clean rebuild of iOS and Android development builds
# For use with Expo dev client (not Expo Go)
# This includes expo prebuild to regenerate native folders with correct versions
#
# Usage:
#   ./scripts/clean-rebuild.sh          # Full clean rebuild with prebuild
#   ./scripts/clean-rebuild.sh --skip-prebuild  # Skip prebuild for faster rebuilds

set -e

SKIP_PREBUILD=false
if [[ "$1" == "--skip-prebuild" ]]; then
  SKIP_PREBUILD=true
fi

echo "🧹 Cleaning build artifacts and caches..."
echo ""

# Determine script location and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Navigate to mobile app directory
cd apps/mobile

# Package/bundle identifiers (from app.json)
ANDROID_PACKAGE="com.anonymous.beakerstack"
IOS_BUNDLE_ID="com.anonymous.beakerstack"

# Function to check if Android device/emulator is connected
check_android_device() {
  if command -v adb &> /dev/null; then
    local devices=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
    if [ "$devices" -gt 0 ]; then
      return 0
    fi
  fi
  return 1
}

# Function to check if iOS simulator is available
check_ios_simulator() {
  if command -v xcrun &> /dev/null; then
    local booted=$(xcrun simctl list devices | grep -i "booted" | wc -l | tr -d ' ')
    if [ "$booted" -gt 0 ]; then
      return 0
    fi
  fi
  return 1
}

# Function to uninstall iOS app from booted simulators
uninstall_ios_app() {
  if command -v xcrun &> /dev/null; then
    # Get list of booted simulators
    local booted_devices=$(xcrun simctl list devices | grep -i "booted" | sed 's/.*(\([^)]*\)).*/\1/')
    if [ -n "$booted_devices" ]; then
      echo "$booted_devices" | while read -r device_id; do
        echo "  Uninstalling from simulator: $device_id"
        xcrun simctl uninstall "$device_id" "$IOS_BUNDLE_ID" 2>/dev/null || {
          echo "  ⚠️  App not installed on simulator $device_id (this is OK if you already deleted it)"
        }
      done
      return 0
    fi
  fi
  return 1
}

# Stop any running Metro/Expo processes
echo "Step 1: Stopping Metro/Expo processes..."
pkill -f 'metro' || true
pkill -f 'expo' || true

# iOS: Uninstall app from booted simulators
echo "Step 2a: Uninstalling iOS app from booted simulators..."
if check_ios_simulator; then
  echo "  Found booted iOS simulator(s), attempting to uninstall app..."
  uninstall_ios_app || {
    echo "  ⚠️  Could not uninstall from simulators"
  }
else
  echo "  ⚠️  No booted iOS simulators detected (skipping uninstall)"
  echo "  Note: Make sure your simulator is running if you want to uninstall the app"
fi

# Android: Uninstall app from connected devices/emulators
echo ""
echo "Step 2b: Uninstalling Android app from connected devices..."
if check_android_device; then
  echo "  Found Android device(s), attempting to uninstall app..."
  adb uninstall "$ANDROID_PACKAGE" 2>/dev/null || {
    echo "  ⚠️  App not installed on device (this is OK if you already deleted it)"
  }
else
  echo "  ⚠️  No Android devices/emulators detected (skipping uninstall)"
  echo "  Note: Make sure your emulator is running if you want to uninstall the app"
fi

# Clear Metro bundler cache
echo ""
echo "Step 3: Clearing Metro bundler cache..."
watchman watch-del-all 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf .metro 2>/dev/null || true

# Clear iOS build artifacts (enhanced cleanup)
echo ""
echo "Step 4: Clearing iOS build artifacts..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/DerivedData 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
# Clear CocoaPods cache
rm -rf ~/Library/Caches/CocoaPods 2>/dev/null || true
# Clear iOS-specific caches
if [ -d ios/Pods ]; then
  rm -rf ios/Pods 2>/dev/null || true
fi
rm -rf ios/Podfile.lock 2>/dev/null || true

# Clear Android build artifacts (enhanced cleanup)
echo ""
echo "Step 5: Clearing Android build artifacts..."
rm -rf android/build 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/.cxx 2>/dev/null || true
rm -rf android/app/.cxx 2>/dev/null || true
rm -rf android/.idea 2>/dev/null || true
rm -rf android/local.properties 2>/dev/null || true
# Clear Gradle caches (more comprehensive)
rm -rf ~/.gradle/caches 2>/dev/null || true
rm -rf ~/.gradle/daemon 2>/dev/null || true
# Clear Android-specific caches
if [ -d "$HOME/.android" ]; then
  rm -rf "$HOME/.android/cache" 2>/dev/null || true
fi

# Clear node_modules caches
echo ""
echo "Step 6: Clearing node_modules caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf ../../node_modules/.cache 2>/dev/null || true

# Regenerate native folders with expo prebuild (unless skipped)
if [ "$SKIP_PREBUILD" = false ]; then
  echo ""
  echo "Step 7: Regenerating native folders with expo prebuild --clean..."
  echo "This ensures native code matches current Expo/React Native versions"
  npx expo prebuild --clean
else
  echo ""
  echo "Step 7: Skipping prebuild (--skip-prebuild flag used)"
  echo "⚠️  Warning: Native folders may be out of sync with current config"
fi

# Apply patches (important for expo-dev-menu fix)
echo ""
echo "Step 8: Applying patches..."
cd "$PROJECT_ROOT"
node apps/mobile/scripts/apply-patches.js 2>/dev/null || {
  echo "  ⚠️  Could not apply patches (this may be OK if no patches exist)"
}
cd apps/mobile

echo ""
echo "✅ Cleanup complete!"
if [ "$SKIP_PREBUILD" = false ]; then
  echo "✅ Native folders regenerated"
fi
echo ""
echo "Next steps:"
echo "  iOS:    cd apps/mobile && npx expo run:ios"
echo "  Android: cd apps/mobile && npx expo run:android"
echo ""
echo "Note: After rebuild, start Metro with:"
echo "  cd apps/mobile && npx expo start"
echo ""
