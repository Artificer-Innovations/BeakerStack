#!/bin/bash
# Script to do a clean rebuild of iOS and Android development builds
# For use with Expo dev client (not Expo Go)
# This includes expo prebuild to regenerate native folders with correct versions

set -e

echo "🧹 Cleaning build artifacts and caches..."
echo ""

cd apps/mobile

# Stop any running Metro/Expo processes
echo "Step 1: Stopping Metro/Expo processes..."
pkill -f 'metro' || true
pkill -f 'expo' || true

# Clear Metro bundler cache
echo "Step 2: Clearing Metro bundler cache..."
watchman watch-del-all 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf .metro 2>/dev/null || true

# Clear iOS build artifacts
echo "Step 3: Clearing iOS build artifacts..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/DerivedData 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true

# Clear Android build artifacts
echo "Step 4: Clearing Android build artifacts..."
rm -rf android/build 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/.cxx 2>/dev/null || true
rm -rf ~/.gradle/caches 2>/dev/null || true

# Clear node_modules caches
echo "Step 5: Clearing node_modules caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf ../../node_modules/.cache 2>/dev/null || true

# Regenerate native folders with expo prebuild
echo ""
echo "Step 6: Regenerating native folders with expo prebuild --clean..."
echo "This ensures native code matches current Expo/React Native versions"
npx expo prebuild --clean

cd ../..

echo ""
echo "✅ Cleanup and prebuild complete!"
echo ""
echo "Native folders regenerated. Now rebuild:"
echo "  iOS:    cd apps/mobile && npx expo run:ios"
echo "  Android: cd apps/mobile && npx expo run:android"
echo ""
echo "Note: After rebuild, start Metro with:"
echo "  cd apps/mobile && npx expo start"
echo ""
