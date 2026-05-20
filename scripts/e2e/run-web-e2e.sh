#!/usr/bin/env bash
# Run Maestro web E2E flows with standard env wiring.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

export PATH="${PATH}:${HOME}/.maestro/bin"

WEB_URL="${WEB_URL:-http://localhost:5173}"
TEST_EMAIL="${TEST_EMAIL:-e2e-test-$(date +%s)@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-${E2E_TEST_PASSWORD:-}}"
E2E_LOGIN_EMAIL="${E2E_LOGIN_EMAIL:-e2e-valid@example.com}"
PREVIEW_COOKIE="${PREVIEW_COOKIE:-}"
PREVIEW_BOOTSTRAP_URL="${PREVIEW_BOOTSTRAP_URL:-}"

if [[ -z "${TEST_PASSWORD}" ]]; then
  TEST_PASSWORD="E2e_$(openssl rand -hex 16)_Aa1"
fi

mkdir -p tests/e2e/results

if [[ -n "${PREVIEW_BOOTSTRAP_URL}" ]]; then
  # shellcheck source=/dev/null
  source ./scripts/e2e/bootstrap-preview-session.sh "${PREVIEW_BOOTSTRAP_URL}"
fi

MAESTRO_ENV=(
  --env "WEB_URL=${WEB_URL}"
  --env "TEST_EMAIL=${TEST_EMAIL}"
  --env "TEST_PASSWORD=${TEST_PASSWORD}"
  --env "E2E_LOGIN_EMAIL=${E2E_LOGIN_EMAIL}"
  --env "PREVIEW_COOKIE=${PREVIEW_COOKIE}"
  --env "PREVIEW_BOOTSTRAP_URL=${PREVIEW_BOOTSTRAP_URL}"
)

FLOW_PATHS=(tests/e2e/web/flows/)
if [[ -n "${PREVIEW_BOOTSTRAP_URL}" ]]; then
  FLOW_PATHS=(tests/e2e/web/subflows/bootstrap-preview.yaml "${FLOW_PATHS[@]}")
fi

maestro test "${FLOW_PATHS[@]}" \
  "${MAESTRO_ENV[@]}" \
  --format junit \
  --output tests/e2e/results/web-results.xml
