#!/bin/bash
# Script to fix React Native version mismatch by clearing all caches and rebuilding

set -e

echo "🔧 Fixing React Native version mismatch..."
echo ""

# Step 1: Clear all Metro/Expo caches
echo "Step 1: Clearing Metro and Expo caches..."
cd apps/mobile
watchman watch-del-all 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf .metro 2>/dev/null || true
rm -rf ios/build 2>/dev/null || true
rm -rf android/build 2>/dev/null || true
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
cd ../..

# Step 2: Clear root node_modules cache
echo "Step 2: Clearing root node_modules cache..."
rm -rf node_modules/.cache 2>/dev/null || true

# Step 3: Reinstall dependencies
echo "Step 3: Reinstalling dependencies..."
npm install

# Step 4: Verify React Native version
echo ""
echo "Step 4: Verifying React Native versions..."
ROOT_RN_VERSION=$(cat node_modules/react-native/package.json | grep '"version"' | head -1 | cut -d'"' -f4)
echo "Root node_modules React Native: $ROOT_RN_VERSION"

MOBILE_RN_VERSION=$(cat apps/mobile/node_modules/react-native/package.json 2>/dev/null | grep '"version"' | head -1 | cut -d'"' -f4 || echo "not installed")
echo "Mobile node_modules React Native: $MOBILE_RN_VERSION"

SHARED_RN_VERSION=$(cat packages/shared/package.json | grep -A 1 '"react-native"' | grep '"version"' | head -1 | cut -d'"' -f4 || echo "devDependency version")
echo "Shared package.json React Native: $SHARED_RN_VERSION"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. For iOS: cd apps/mobile && npx expo run:ios"
echo "2. For Android: cd apps/mobile && npx expo run:android"
echo ""
echo "Or if using Expo Go, restart Metro with:"
echo "  cd apps/mobile && npx expo start --clear"
