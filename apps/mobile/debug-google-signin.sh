#!/usr/bin/env bash
# Debug script for Google Sign-In configuration
# This helps verify that Google Sign-In is properly configured for Android

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "🔍 Google Sign-In Configuration Debug"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Source .env.local if it exists
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

echo "📋 Environment Variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "${GOOGLE_SERVICES_WEB_CLIENT_ID:-}" ]; then
  echo "✅ GOOGLE_SERVICES_WEB_CLIENT_ID is set"
  echo "   Value: ${GOOGLE_SERVICES_WEB_CLIENT_ID:0:30}... (truncated)"
else
  echo "❌ GOOGLE_SERVICES_WEB_CLIENT_ID is NOT set"
fi

if [ -n "${GOOGLE_SERVICES_ANDROID_CLIENT_ID:-}" ]; then
  echo "✅ GOOGLE_SERVICES_ANDROID_CLIENT_ID is set"
  echo "   Value: ${GOOGLE_SERVICES_ANDROID_CLIENT_ID:0:30}... (truncated)"
else
  echo "❌ GOOGLE_SERVICES_ANDROID_CLIENT_ID is NOT set"
fi

if [ -n "${GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH:-}" ]; then
  echo "✅ GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH is set"
  echo "   Value: ${GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH}"
else
  echo "❌ GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH is NOT set"
fi

echo ""
echo "🔑 Android Certificate Hash Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we can get the SHA-1 from the keystore
if command -v keytool &> /dev/null; then
  echo "Checking for EAS-managed keystore..."
  
  # EAS stores keystores in ~/.expo/credentials/android
  EAS_KEYSTORE_DIR="$HOME/.expo/credentials/android"
  if [ -d "${EAS_KEYSTORE_DIR}" ]; then
    echo "✅ Found EAS credentials directory: ${EAS_KEYSTORE_DIR}"
    
    # Try to find keystore files
    KEYSTORE_FILES=$(find "${EAS_KEYSTORE_DIR}" -name "*.jks" -o -name "*.keystore" 2>/dev/null || true)
    if [ -n "${KEYSTORE_FILES}" ]; then
      echo "   Found keystore files:"
      echo "${KEYSTORE_FILES}" | while read -r keystore; do
        echo "   - ${keystore}"
        # Try to get SHA-1 (this might require password, so we'll just show the attempt)
        echo "     (To get SHA-1: keytool -list -v -keystore \"${keystore}\" -alias <alias> -storepass <password>)"
      done
    else
      echo "   ⚠️  No keystore files found"
    fi
  else
    echo "⚠️  EAS credentials directory not found: ${EAS_KEYSTORE_DIR}"
  fi
else
  echo "⚠️  keytool not found. Install Java JDK to check keystore SHA-1."
fi

echo ""
echo "📱 Android Debug Keystore (for local builds):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "${DEBUG_KEYSTORE}" ]; then
  echo "✅ Found debug keystore: ${DEBUG_KEYSTORE}"
  if command -v keytool &> /dev/null; then
    echo "   Getting SHA-1 from debug keystore..."
    SHA1=$(keytool -list -v -keystore "${DEBUG_KEYSTORE}" -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -i "SHA1:" | sed 's/.*SHA1: //' | tr -d ' ' || echo "")
    if [ -n "${SHA1}" ]; then
      echo "   SHA-1: ${SHA1}"
      echo ""
      echo "   ⚠️  IMPORTANT: Make sure this SHA-1 is registered in Google Cloud Console"
      echo "      for your Android OAuth client (GOOGLE_SERVICES_ANDROID_CLIENT_ID)"
    else
      echo "   ⚠️  Could not extract SHA-1 (keytool may need password)"
    fi
  else
    echo "   ⚠️  keytool not available to check SHA-1"
  fi
else
  echo "⚠️  Debug keystore not found: ${DEBUG_KEYSTORE}"
  echo "   This is normal if you haven't built Android apps locally yet"
fi

echo ""
echo "💡 Troubleshooting Tips:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Check app logs:"
echo "   - Use Chrome DevTools (enable Remote JS Debugging)"
echo "   - Or use: adb logcat | grep -i 'google\|signin\|auth'"
echo ""
echo "2. Verify Google Cloud Console:"
echo "   - Ensure GOOGLE_SERVICES_ANDROID_CLIENT_ID exists"
echo "   - Ensure SHA-1 certificate hash is registered"
echo "   - For EAS builds: Use the SHA-1 from EAS keystore"
echo "   - For local builds: Use the SHA-1 from debug.keystore"
echo ""
echo "3. Common errors:"
echo "   - '10:' error code = Configuration issue (check client IDs)"
echo "   - '12500:' error code = SHA-1 not registered in Google Cloud Console"
echo "   - '12501:' error code = Sign-in cancelled by user"
echo ""
echo "4. Check the app logs for detailed error messages:"
echo "   Look for '[useAuth]' log entries with error details"

