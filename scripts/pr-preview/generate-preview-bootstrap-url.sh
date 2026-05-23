#!/usr/bin/env bash
# Generate a CloudFront signed-cookie bootstrap URL for PR preview access.
# Prints BOOTSTRAP_URL and ACCESS_MODE to stdout (KEY=value) and optionally GITHUB_OUTPUT.
#
# Usage (GitHub Actions — writes step outputs, no stdout):
#   ./scripts/pr-preview/generate-preview-bootstrap-url.sh \
#     --domain "${PREVIEW_DOMAIN}" \
#     --preview-prefix pr- \
#     --pr-number 42 \
#     --signing-key "$CLOUDFRONT_SIGNING_KEY" \
#     --signing-key-id "$CLOUDFRONT_SIGNING_KEY_ID"
#
# Usage (local shell — prints KEY=value to stdout):
#   eval "$(./scripts/pr-preview/generate-preview-bootstrap-url.sh ...)"
#
# When neither signing secret is set, exits 0 with ACCESS_MODE=public (no bootstrap URL).

set -euo pipefail

PREVIEW_DOMAIN=""
PREVIEW_PREFIX="pr-"
PR_NUMBER=""
SIGNING_KEY=""
SIGNING_KEY_ID=""
GITHUB_OUTPUT="${GITHUB_OUTPUT:-}"

usage() {
  sed -n '1,20p' "$0"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      PREVIEW_DOMAIN="${2:-}"
      shift 2
      ;;
    --preview-prefix)
      PREVIEW_PREFIX="${2:-}"
      shift 2
      ;;
    --pr-number)
      PR_NUMBER="${2:-}"
      shift 2
      ;;
    --signing-key)
      SIGNING_KEY="${2:-}"
      shift 2
      ;;
    --signing-key-id)
      SIGNING_KEY_ID="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "${PREVIEW_DOMAIN}" || -z "${PR_NUMBER}" ]]; then
  echo "Missing required --domain and --pr-number" >&2
  exit 1
fi

emit_output() {
  local key="$1"
  local value="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      echo "${key}=${value}"
    } >> "${GITHUB_OUTPUT}"
  else
    printf '%s=%s\n' "${key}" "${value}"
  fi
}

if [[ -z "${SIGNING_KEY}" && -z "${SIGNING_KEY_ID}" ]]; then
  emit_output "ACCESS_MODE" "public"
  exit 0
fi

if [[ -z "${SIGNING_KEY}" || -z "${SIGNING_KEY_ID}" ]]; then
  echo "::error::CLOUDFRONT_SIGNING_KEY and CLOUDFRONT_SIGNING_KEY_ID must both be set. Configure both secrets or neither." >&2
  exit 1
fi

PREVIEW_PREFIX_VALUE="${PREVIEW_PREFIX:-pr-}"
DEPLOY_DOMAIN="deploy.${PREVIEW_DOMAIN}"

DEST="/${PREVIEW_PREFIX_VALUE}${PR_NUMBER}/"
RESOURCE="https://${DEPLOY_DOMAIN}/${PREVIEW_PREFIX_VALUE}${PR_NUMBER}/*"
EXPIRY=$(date -u -d "+7 days" +%s 2>/dev/null || date -u -v+7d +%s)

POLICY_JSON=$(printf '{"Statement":[{"Resource":"%s","Condition":{"DateLessThan":{"AWS:EpochTime":%s}}}]}' \
  "${RESOURCE}" "${EXPIRY}")

CF_POLICY=$(printf '%s' "${POLICY_JSON}" | base64 | tr -d '\n' | tr '+' '-' | tr '/' '~' | tr '=' '_')

KEY_FILE=$(mktemp)
chmod 600 "${KEY_FILE}"
printf '%s' "${SIGNING_KEY}" > "${KEY_FILE}"
CF_SIGNATURE=$(printf '%s' "${POLICY_JSON}" | \
  openssl dgst -sha1 -sign "${KEY_FILE}" | base64 | tr -d '\n' | tr '+' '-' | tr '/' '~' | tr '=' '_')
rm -f "${KEY_FILE}"

ENCODED_DEST=$(printf '%s' "${DEST}" | python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read().strip()))")
BOOTSTRAP_URL="https://${DEPLOY_DOMAIN}/_preview-auth?policy=${CF_POLICY}&sig=${CF_SIGNATURE}&kid=${SIGNING_KEY_ID}&dest=${ENCODED_DEST}"

emit_output "BOOTSTRAP_URL" "${BOOTSTRAP_URL}"
emit_output "ACCESS_MODE" "signed-cookies"
