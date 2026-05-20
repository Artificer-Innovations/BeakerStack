#!/usr/bin/env bash
# Bootstrap signed-cookie access for PR preview URLs.
#
# Usage:
#   ./scripts/e2e/bootstrap-preview-session.sh <bootstrap_url>
#
# Exports:
#   PREVIEW_COOKIE  — Cookie header value for Maestro / curl (may be empty)
#   WEB_URL         — Preview web base URL (unchanged if already set)
#
# If the argument is empty or looks like a normal preview URL (no bootstrap path),
# this script is a no-op.

set -euo pipefail

BOOTSTRAP_URL="${1:-}"
PREVIEW_COOKIE=""

if [[ -z "${BOOTSTRAP_URL}" ]]; then
  export PREVIEW_COOKIE=""
  exit 0
fi

# Only curl when this is a bootstrap/access link (signed-cookie flow).
if [[ "${BOOTSTRAP_URL}" != *"bootstrap"* && "${BOOTSTRAP_URL}" != *"access"* ]]; then
  export PREVIEW_COOKIE=""
  exit 0
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}"' EXIT

echo "Bootstrapping preview session: ${BOOTSTRAP_URL}"
curl -sS -L -c "${COOKIE_JAR}" -o /dev/null "${BOOTSTRAP_URL}"

if [[ -s "${COOKIE_JAR}" ]]; then
  PREVIEW_COOKIE="$(
    awk '
      /^#/ { next }
      NF >= 7 {
        name = $6
        value = $7
        if (name != "" && value != "") {
          if (cookie != "") cookie = cookie "; "
          cookie = cookie name "=" value
        }
      }
      END { print cookie }
    ' "${COOKIE_JAR}"
  )"
fi

export PREVIEW_COOKIE="${PREVIEW_COOKIE}"
if [[ -n "${PREVIEW_COOKIE}" ]]; then
  echo "✅ Preview session cookie captured"
else
  echo "ℹ️  No cookies returned (open preview may not require bootstrap)"
fi
