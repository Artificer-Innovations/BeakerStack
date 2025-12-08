#!/usr/bin/env bash
# Helper script to rebuild with environment variables for local builds

set -euo pipefail

# Source .env.local if it exists
if [ -f .env.local ]; then
  source .env.local
fi

# You need to set these for preview-device profile:
# If they're not set, the build will use {{PLACEHOLDER}} as literal values

# Check if preview Supabase vars are set
if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "⚠️  EXPO_PUBLIC_SUPABASE_URL not set"
  echo "   Set it to your preview Supabase URL before building"
  echo "   Example: export EXPO_PUBLIC_SUPABASE_URL='https://your-preview-project.supabase.co'"
fi

if [ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY not set"
fi

# Build with the environment variables
echo "Building with current environment variables..."
npx eas build --platform ios --profile preview-device --local
