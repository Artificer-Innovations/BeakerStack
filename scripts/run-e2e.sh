#!/bin/bash
# E2E Test Runner Script
# Runs Maestro E2E tests against different environments

set -e

ENVIRONMENT=${1:-local}
PR_NUMBER=${2:-}
WEB_URL=""
MOBILE_APP_ID="com.anonymous.beakerstack"

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
    WEB_URL="https://pr-${PR_NUMBER}.yourdomain.com"
    echo "🧪 Running E2E tests against PR #${PR_NUMBER} environment"
    ;;
  staging)
    WEB_URL="https://staging.yourdomain.com"
    echo "🧪 Running E2E tests against STAGING environment"
    ;;
  production)
    WEB_URL="https://yourdomain.com"
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
  echo "❌ Maestro is not installed"
  echo "📦 Installing Maestro..."
  curl -Ls "https://get.maestro.mobile.dev" | bash
  export PATH="$HOME/.maestro/bin:$PATH"
fi

# Export environment variables for Maestro
export WEB_URL="$WEB_URL"
export MOBILE_APP_ID="$MOBILE_APP_ID"
export TEST_EMAIL="e2e-test-${RANDOM}@example.com"
export TEST_PASSWORD="TestPassword123!"

echo ""
echo "📋 Test Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Web URL: $WEB_URL"
echo "   Mobile App ID: $MOBILE_APP_ID"
echo "   Test Email: $TEST_EMAIL"
echo ""

# Create screenshots directory
SCREENSHOTS_DIR="tests/e2e/screenshots"
mkdir -p "$SCREENSHOTS_DIR"

# Run Web E2E Tests
echo "🌐 Running Web E2E Tests..."
echo ""

if [ "$ENVIRONMENT" != "local" ]; then
  # For non-local environments, use the web URL
  maestro test tests/e2e/web/flows/ \
    --env WEB_URL="$WEB_URL" \
    --env TEST_EMAIL="$TEST_EMAIL" \
    --env TEST_PASSWORD="$TEST_PASSWORD" \
    --format junit \
    --output tests/e2e/results/web-results.xml || {
    echo "❌ Web E2E tests failed"
    exit 1
  }
else
  # For local, check if dev server is running
  if ! curl -s "$WEB_URL" > /dev/null 2>&1; then
    echo "⚠️  Warning: Web dev server not running at $WEB_URL"
    echo "   Start it with: npm run web"
    echo "   Or skip web tests with: --skip-web"
  else
    maestro test tests/e2e/web/flows/ \
      --env WEB_URL="$WEB_URL" \
      --env TEST_EMAIL="$TEST_EMAIL" \
      --env TEST_PASSWORD="$TEST_PASSWORD" \
      --format junit \
      --output tests/e2e/results/web-results.xml || {
      echo "❌ Web E2E tests failed"
      exit 1
    }
  fi
fi

echo ""
echo "📱 Running Mobile E2E Tests..."
echo "⚠️  Note: Mobile tests require the app to be installed on a device/simulator"
echo ""

# Check if mobile app is available
if [ "$ENVIRONMENT" = "local" ]; then
  echo "ℹ️  For local mobile testing, ensure:"
  echo "   1. App is built and installed: npm run mobile:ios or npm run mobile:android"
  echo "   2. Device/emulator is running"
  echo ""
  read -p "Continue with mobile tests? (yes/no): " mobile_confirm
  if [ "$mobile_confirm" != "yes" ]; then
    echo "⏭️  Skipping mobile tests"
  else
    maestro test tests/e2e/mobile/flows/ \
      --env MOBILE_APP_ID="$MOBILE_APP_ID" \
      --env TEST_EMAIL="$TEST_EMAIL" \
      --env TEST_PASSWORD="$TEST_PASSWORD" \
      --format junit \
      --output tests/e2e/results/mobile-results.xml || {
      echo "❌ Mobile E2E tests failed"
      exit 1
    }
  fi
else
  echo "ℹ️  For PR/Staging/Production mobile testing:"
  echo "   1. Install app from EAS channel: $ENVIRONMENT or pr-$PR_NUMBER"
  echo "   2. Ensure device/emulator is running"
  echo ""
  read -p "Continue with mobile tests? (yes/no): " mobile_confirm
  if [ "$mobile_confirm" != "yes" ]; then
    echo "⏭️  Skipping mobile tests"
  else
    maestro test tests/e2e/mobile/flows/ \
      --env MOBILE_APP_ID="$MOBILE_APP_ID" \
      --env TEST_EMAIL="$TEST_EMAIL" \
      --env TEST_PASSWORD="$TEST_PASSWORD" \
      --format junit \
      --output tests/e2e/results/mobile-results.xml || {
      echo "❌ Mobile E2E tests failed"
      exit 1
    }
  fi
fi

echo ""
echo "✅ E2E tests complete!"
echo "📊 Results saved to: tests/e2e/results/"
echo "📸 Screenshots saved to: $SCREENSHOTS_DIR"

