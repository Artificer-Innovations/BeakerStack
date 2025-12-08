#!/usr/bin/env bash
# Build script for local Android device builds
# This script ensures environment variables are set correctly for local builds

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Source .env.local if it exists
if [ -f .env.local ]; then
  echo "📋 Loading environment variables from .env.local..."
  set -a
  source .env.local
  set +a
fi

# For preview builds, check if preview-specific Supabase URLs are set
# If PREVIEW_SUPABASE_URL is set, use it instead of the local dev URL
if [ -n "${PREVIEW_SUPABASE_URL:-}" ]; then
  echo "🔀 Using PREVIEW Supabase URL (overriding local dev URL)"
  export EXPO_PUBLIC_SUPABASE_URL="${PREVIEW_SUPABASE_URL}"
  if [ -n "${PREVIEW_SUPABASE_ANON_KEY:-}" ]; then
    export EXPO_PUBLIC_SUPABASE_ANON_KEY="${PREVIEW_SUPABASE_ANON_KEY}"
  else
    echo "⚠️  Warning: PREVIEW_SUPABASE_URL is set but PREVIEW_SUPABASE_ANON_KEY is not"
  fi
else
  echo "ℹ️  Using local dev Supabase URL from .env.local"
  echo "   To use preview Supabase, set PREVIEW_SUPABASE_URL and PREVIEW_SUPABASE_ANON_KEY"
fi

# For local builds, EAS should use environment variables directly
# The {{VARIABLE_NAME}} placeholders in eas.json are for cloud builds only
# We need to ensure the variables are set with the exact names from eas.json

# Check required variables
REQUIRED_VARS=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  "GOOGLE_SERVICES_PROJECT_NUMBER"
  "GOOGLE_SERVICES_PROJECT_ID"
  "GOOGLE_SERVICES_STORAGE_BUCKET"
  "GOOGLE_SERVICES_MOBILESDK_APP_ID"
  "GOOGLE_SERVICES_ANDROID_CLIENT_ID"
  "GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH"
  "GOOGLE_SERVICES_WEB_CLIENT_ID"
  "GOOGLE_SERVICES_IOS_CLIENT_ID"
  "GOOGLE_SERVICES_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING_VARS+=("${var}")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '   - %s\n' "${MISSING_VARS[@]}"
  echo ""
  echo "Please set these in .env.local or export them before running this script."
  exit 1
fi

echo "✅ All required environment variables are set"
echo "🔨 Building Android device build locally..."
echo "   Using 'preview-device-local' profile (reads from environment variables)"

# Build with environment variables set
# Using preview-device-local profile which doesn't use {{}} placeholders
# It will read environment variables directly from the shell
npx eas build --platform android --profile preview-device-local --local

echo ""
echo "✅ Build complete!"
echo ""
echo "To install on your connected Android device:"
echo "  1. Find the .apk file in the build output above"
echo "  2. Run: adb install <path-to-apk>"
echo ""
echo "Or use the install script:"
echo "  ./install-local-device-android.sh <path-to-apk>"

