#!/bin/bash
# E2E Test Runner Script
# Runs Maestro E2E tests against different environments

set -e

ENVIRONMENT=${1:-local}
PR_NUMBER=${2:-}
WEB_URL=""
MOBILE_APP_ID="com.anonymous.beakerstack"
E2E_LOGIN_EMAIL="${E2E_LOGIN_EMAIL:-e2e-valid@example.com}"

# Determine environment URLs
case "$ENVIRONMENT" in
  local)
    WEB_URL="http://localhost:5173"
    echo "🧪 Running E2E tests against LOCAL environment"
    ;;
  pr)
    if [ -z "$PR_NUMBER" ]; then
      echo "❌ Error: PR number required for PR environment"
      echo "Usage: ./scripts/run-e2e.sh pr <PR_NUMBER>"
      exit 1
    fi
    PREVIEW_DOMAIN="${PR_PREVIEW_DOMAIN:-}"
    PREVIEW_PREFIX="${PR_PREVIEW_PREFIX:-pr-}"
    if [ -z "$PREVIEW_DOMAIN" ]; then
      echo "❌ Error: PR_PREVIEW_DOMAIN is required for pr environment"
      echo "   Example: PR_PREVIEW_DOMAIN=beakerstack.com ./scripts/run-e2e.sh pr 123"
      exit 1
    fi
    WEB_URL="https://deploy.${PREVIEW_DOMAIN}/${PREVIEW_PREFIX}${PR_NUMBER}/"
    echo "🧪 Running E2E tests against PR #${PR_NUMBER} environment"
    ;;
  staging)
    STAGING_DOMAIN="${STAGING_WEB_DOMAIN:-staging.yourdomain.com}"
    WEB_URL="https://${STAGING_DOMAIN}"
    echo "🧪 Running E2E tests against STAGING environment"
    ;;
  production)
    PROD_DOMAIN="${PRODUCTION_WEB_DOMAIN:-yourdomain.com}"
    WEB_URL="https://${PROD_DOMAIN}"
    echo "🧪 Running E2E tests against PRODUCTION environment"
    echo "⚠️  WARNING: Running tests against production!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 1
    fi
    ;;
  *)
    echo "❌ Error: Unknown environment: $ENVIRONMENT"
    echo "Usage: ./scripts/run-e2e.sh [local|pr|staging|production] [PR_NUMBER]"
    exit 1
    ;;
esac

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
  echo "📦 Installing Maestro..."
  MAESTRO_VERSION="${MAESTRO_VERSION:-1.39.0}" ./scripts/e2e/install-maestro.sh
  export PATH="$HOME/.maestro/bin:$PATH"
fi

# Export environment variables for Maestro
export WEB_URL="$WEB_URL"
export MOBILE_APP_ID="$MOBILE_APP_ID"
export TEST_EMAIL="${TEST_EMAIL:-e2e-test-${RANDOM}@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-${E2E_TEST_PASSWORD:-E2e_$(openssl rand -hex 16)_Aa1}}"
export E2E_LOGIN_EMAIL="$E2E_LOGIN_EMAIL"

echo ""
echo "📋 Test Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Web URL: $WEB_URL"
echo "   Mobile App ID: $MOBILE_APP_ID"
echo "   Test Email: $TEST_EMAIL"
echo "   E2E Login Email: $E2E_LOGIN_EMAIL"
echo ""

# Seed predefined login user for local runs
if [ "$ENVIRONMENT" = "local" ]; then
  if command -v supabase &> /dev/null && supabase status &> /dev/null; then
    echo "🌱 Seeding E2E login user (local Supabase)..."
    SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}" \
    SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.3a1SuBbAPEU4S9r0iEmL4YI9P_HT8bjemN7Dz9f1hQ0}" \
    E2E_TEST_PASSWORD="${TEST_PASSWORD}" \
    node ./scripts/e2e/seed-e2e-user.mjs || echo "⚠️  Could not seed E2E user (login tests may fail)"
  else
    echo "ℹ️  Skipping E2E user seed (local Supabase not running)"
  fi
fi

# Create output directories
mkdir -p tests/e2e/screenshots tests/e2e/results

# Run Web E2E Tests
echo "🌐 Running Web E2E Tests..."
echo ""

if [ "$ENVIRONMENT" = "local" ]; then
  if ! curl -s "$WEB_URL" > /dev/null 2>&1; then
    echo "⚠️  Warning: Web dev server not running at $WEB_URL"
    echo "   Start it with: npm run web"
    echo "   Skipping web tests."
  else
    ./scripts/e2e/run-web-e2e.sh
  fi
else
  ./scripts/e2e/run-web-e2e.sh
fi

echo ""
echo "📱 Running Mobile E2E Tests..."
echo "⚠️  Note: Mobile tests require the app to be installed on a device/simulator"
echo ""

run_mobile_tests() {
  maestro test tests/e2e/mobile/flows/ \
    --env MOBILE_APP_ID="$MOBILE_APP_ID" \
    --env TEST_EMAIL="$TEST_EMAIL" \
    --env TEST_PASSWORD="$TEST_PASSWORD" \
    --env E2E_LOGIN_EMAIL="$E2E_LOGIN_EMAIL" \
    --format junit \
    --output tests/e2e/results/mobile-results.xml
}

if [ "$ENVIRONMENT" = "local" ]; then
  echo "ℹ️  For local mobile testing, ensure:"
  echo "   1. App is built and installed: npm run mobile:ios or npm run mobile:android"
  echo "   2. Device/emulator is running"
  echo ""
  read -p "Continue with mobile tests? (yes/no): " mobile_confirm
  if [ "$mobile_confirm" = "yes" ]; then
    if command -v supabase &> /dev/null && supabase status &> /dev/null; then
      SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}" \
      SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.3a1SuBbAPEU4S9r0iEmL4YI9P_HT8bjemN7Dz9f1hQ0}" \
      E2E_TEST_PASSWORD="${TEST_PASSWORD}" \
      node ./scripts/e2e/seed-e2e-user.mjs || true
    fi
    run_mobile_tests || { echo "❌ Mobile E2E tests failed"; exit 1; }
  else
    echo "⏭️  Skipping mobile tests"
  fi
else
  echo "ℹ️  For PR/Staging/Production mobile testing:"
  echo "   1. Install app from EAS channel: $ENVIRONMENT or pr-$PR_NUMBER"
  echo "   2. Ensure device/emulator is running"
  echo ""
  read -p "Continue with mobile tests? (yes/no): " mobile_confirm
  if [ "$mobile_confirm" = "yes" ]; then
    run_mobile_tests || { echo "❌ Mobile E2E tests failed"; exit 1; }
  else
    echo "⏭️  Skipping mobile tests"
  fi
fi

echo ""
echo "✅ E2E tests complete!"
echo "📊 Results saved to: tests/e2e/results/"
echo "📸 Screenshots saved to: tests/e2e/screenshots/"
