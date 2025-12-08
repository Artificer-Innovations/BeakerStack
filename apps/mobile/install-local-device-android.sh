#!/usr/bin/env bash
# Install script for local Android device builds
# Usage: ./install-local-device-android.sh <path-to-apk>

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <path-to-apk>"
  echo ""
  echo "Example:"
  echo "  $0 build-1234567890.apk"
  echo "  $0 ~/Downloads/BeakerStack.apk"
  exit 1
fi

APK_PATH="$1"

if [ ! -f "${APK_PATH}" ]; then
  echo "❌ Error: APK file not found: ${APK_PATH}"
  exit 1
fi

# Get the absolute path
APK_PATH="$(cd "$(dirname "${APK_PATH}")" && pwd)/$(basename "${APK_PATH}")"

echo "📱 Installing ${APK_PATH} on connected Android device..."

# Check if adb is available
if ! command -v adb &> /dev/null; then
  echo "❌ Error: adb not found. Please install Android SDK Platform Tools."
  echo "   On macOS: brew install android-platform-tools"
  exit 1
fi

# Check if device is connected
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "${DEVICES}" -eq 0 ]; then
  echo "❌ Error: No Android device found. Please:"
  echo "   1. Connect your Android device via USB"
  echo "   2. Enable USB debugging on your device"
  echo "   3. Run: adb devices"
  echo ""
  echo "If your device shows 'unauthorized', accept the USB debugging prompt on your device."
  exit 1
fi

if [ "${DEVICES}" -gt 1 ]; then
  echo "⚠️  Warning: Multiple devices connected. Using the first one."
fi

echo "   Found ${DEVICES} device(s)"

# Uninstall existing app if present (optional, but helps avoid conflicts)
PACKAGE_NAME="com.anonymous.beakerstack"
if adb shell pm list packages | grep -q "${PACKAGE_NAME}"; then
  echo "   Uninstalling existing app..."
  adb uninstall "${PACKAGE_NAME}" 2>/dev/null || true
fi

# Install the app
echo "   Installing ${APK_PATH}..."
adb install -r "${APK_PATH}"

if [ $? -eq 0 ]; then
  echo "✅ Installation complete!"
  echo "   The app should now appear on your Android device home screen."
else
  echo "❌ Installation failed. Check the error messages above."
  exit 1
fi

