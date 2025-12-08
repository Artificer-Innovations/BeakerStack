#!/usr/bin/env bash
# Check environment variables for preview builds
# This helps verify that the correct Supabase URL is set

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "🔍 Checking environment variables for preview builds..."
echo ""

# Source .env.local if it exists
if [ -f .env.local ]; then
  echo "📋 Loading from .env.local..."
  set -a
  source .env.local
  set +a
else
  echo "⚠️  .env.local not found"
fi

echo ""
echo "Supabase Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "✅ EXPO_PUBLIC_SUPABASE_URL is set"
  echo "   Value: ${EXPO_PUBLIC_SUPABASE_URL}"
  
  # Check if it's a preview URL
  if [[ "${EXPO_PUBLIC_SUPABASE_URL}" == *"preview"* ]] || [[ "${EXPO_PUBLIC_SUPABASE_URL}" == *"pr-"* ]]; then
    echo "   ✓ Looks like a preview Supabase URL"
  elif [[ "${EXPO_PUBLIC_SUPABASE_URL}" == *"localhost"* ]] || [[ "${EXPO_PUBLIC_SUPABASE_URL}" == *"127.0.0.1"* ]]; then
    echo "   ⚠️  WARNING: This looks like a local dev Supabase URL!"
    echo "      For preview builds, you should use your preview Supabase URL"
  else
    echo "   ? Unknown Supabase environment (could be staging/production)"
  fi
else
  echo "❌ EXPO_PUBLIC_SUPABASE_URL is NOT set"
fi

if [ -n "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "✅ EXPO_PUBLIC_SUPABASE_ANON_KEY is set"
  echo "   Value: ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:20}... (truncated)"
else
  echo "❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is NOT set"
fi

echo ""
echo "Google Services Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_GOOGLE_VARS=(
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

for var in "${REQUIRED_GOOGLE_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "✅ ${var} is set"
  else
    echo "❌ ${var} is NOT set"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tip: If EXPO_PUBLIC_SUPABASE_URL points to localhost, update it to your preview Supabase URL"
echo "   Preview Supabase URLs typically look like: https://xxxxx.supabase.co"

