#!/usr/bin/env bash
# Resolve PR preview web URL and optional bootstrap URL from env or PR comments.
#
# Usage:
#   ./scripts/e2e/resolve-preview-url.sh <pr_number>
#
# Requires gh CLI and GITHUB_TOKEN when fetching comments.
# Exports WEB_URL and PREVIEW_BOOTSTRAP_URL.

set -euo pipefail

PR_NUMBER="${1:-}"
if [[ -z "${PR_NUMBER}" ]]; then
  echo "Usage: $0 <pr_number>" >&2
  exit 1
fi

PREVIEW_DOMAIN="${PR_PREVIEW_DOMAIN:-}"
PREVIEW_PREFIX="${PR_PREVIEW_PREFIX:-pr-}"

if [[ -n "${PREVIEW_DOMAIN}" ]]; then
  WEB_URL="https://deploy.${PREVIEW_DOMAIN}/${PREVIEW_PREFIX}${PR_NUMBER}/"
  export WEB_URL
  echo "WEB_URL=${WEB_URL}"
fi

PREVIEW_BOOTSTRAP_URL=""
if command -v gh >/dev/null 2>&1 && [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  body="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate -q '.[].body' 2>/dev/null || true)"
  if [[ -n "${body}" ]]; then
    PREVIEW_BOOTSTRAP_URL="$(
      printf '%s\n' "${body}" | grep -oE 'https://[^)]+' | grep -E 'bootstrap|access' | tail -1 || true
    )"
  fi
fi

export PREVIEW_BOOTSTRAP_URL="${PREVIEW_BOOTSTRAP_URL}"
echo "PREVIEW_BOOTSTRAP_URL=${PREVIEW_BOOTSTRAP_URL}"
