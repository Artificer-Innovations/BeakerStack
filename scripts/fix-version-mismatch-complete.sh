#!/bin/bash
# Complete fix for React Native version mismatch
# This ensures JavaScript and native code versions match

set -e

echo "🔧 Complete React Native Version Mismatch Fix"
echo "=============================================="
echo ""

cd apps/mobile

# Step 1: Stop everything
echo "Step 1: Stopping all processes..."
pkill -f 'metro' 2>/dev/null || true
pkill -f 'expo' 2>/dev/null || true
killall -9 node 2>/dev/null || true

# Step 2: Clear ALL caches
echo "Step 2: Clearing all caches..."
watchman watch-del-all 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf .metro 2>/dev/null || true
rm -rf ../../node_modules/.cache 2>/dev/null || true
rm -rf ~/Library/Caches/CocoaPods 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true

# Step 3: Remove old native folders completely
echo "Step 3: Removing old native folders..."
rm -rf ios 2>/dev/null || true
rm -rf android 2>/dev/null || true

# Step 4: Clean node_modules and reinstall
echo "Step 4: Reinstalling dependencies..."
cd ../..
rm -rf node_modules
npm install

# Step 5: Regenerate native folders from scratch
echo ""
echo "Step 5: Regenerating native folders with expo prebuild..."
cd apps/mobile
npx expo prebuild --clean --platform ios --platform android

# Step 6: Install iOS pods
echo ""
echo "Step 6: Installing iOS CocoaPods..."
cd ios
pod deintegrate 2>/dev/null || true
pod cache clean --all 2>/dev/null || true
pod install --repo-update
cd ..

# Step 7: Verify versions
echo ""
echo "Step 7: Verifying React Native versions..."
RN_VERSION=$(node -e "console.log(require('react-native/package.json').version)")
echo "React Native version in node_modules: $RN_VERSION"

if [ "$RN_VERSION" != "0.73.6" ]; then
    echo "⚠️  WARNING: React Native version is $RN_VERSION, expected 0.73.6"
    echo "   This may cause version mismatch errors"
fi

cd ../..

echo ""
echo "✅ Complete fix finished!"
echo ""
echo "CRITICAL: You must UNINSTALL the app from your device/simulator first!"
echo ""
echo "For iOS Simulator:"
echo "  Simulator > Device > Erase All Content and Settings"
echo "  OR delete the app from the simulator"
echo ""
echo "For Android Emulator:"
echo "  Uninstall the app: adb uninstall com.anonymous.beakerstack"
echo ""
echo "Then rebuild and install:"
echo "  cd apps/mobile"
echo "  npx expo run:ios --clean"
echo "  # or"
echo "  npx expo run:android --clean"
echo ""

