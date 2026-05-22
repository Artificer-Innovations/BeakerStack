#!/usr/bin/env bash
# Push supabase/config.toml auth + email settings to a linked hosted project.
# Requires SMTP_* and SUPABASE_AUTH_SITE_URL in the environment (see docs/EMAIL_TEMPLATES.md).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SUPABASE_DIR="${REPO_ROOT}/supabase"

PROJECT_REF=""
DB_PASSWORD=""
SITE_URL="${SUPABASE_AUTH_SITE_URL:-}"
ADDITIONAL_REDIRECT_URL="${SUPABASE_ADDITIONAL_REDIRECT_URL:-}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: sync-supabase-auth-config.sh --project-ref REF --db-password PASS [options]

Pushes local supabase/config.toml (auth site URL, email templates, SMTP block) to the
linked hosted project via `supabase config push`.

Required:
  --project-ref REF       Supabase project ref
  --db-password PASS      Database password for supabase link

Options:
  --site-url URL          SUPABASE_AUTH_SITE_URL for this environment
  --additional-redirect-url URL   Extra redirect URL (optional; can repeat via env)
  --dry-run               Print actions only

Environment (required for SMTP when [auth.email.smtp] is enabled in config.toml):
  SUPABASE_ACCESS_TOKEN
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  SMTP_ADMIN_EMAIL, SMTP_SENDER_NAME
  SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID, SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
    (required — config push includes [auth.external.google]; unset values wipe hosted OAuth)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref) PROJECT_REF="$2"; shift 2 ;;
    --db-password) DB_PASSWORD="$2"; shift 2 ;;
    --site-url) SITE_URL="$2"; shift 2 ;;
    --additional-redirect-url) ADDITIONAL_REDIRECT_URL="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "${PROJECT_REF}" || -z "${DB_PASSWORD}" ]]; then
  echo "Error: --project-ref and --db-password are required." >&2
  usage
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set." >&2
  exit 1
fi

if [[ -z "${SITE_URL}" ]]; then
  echo "Error: set --site-url or SUPABASE_AUTH_SITE_URL." >&2
  exit 1
fi

for key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_ADMIN_EMAIL SMTP_SENDER_NAME; do
  if [[ -z "${!key:-}" ]]; then
    echo "Error: ${key} must be set for config push (Resend SMTP)." >&2
    exit 1
  fi
done

for key in SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET; do
  if [[ -z "${!key:-}" ]]; then
    echo "Error: ${key} must be set for config push." >&2
    echo "  Hosted deploys push supabase/config.toml including [auth.external.google]." >&2
    echo "  Without these env vars, config push would wipe Google OAuth (invalid_client)." >&2
    echo "  Run: npm run setup:full -- --from=google  (or add secrets via gh secret set)" >&2
    exit 1
  fi
done

export SUPABASE_AUTH_SITE_URL="${SITE_URL}"
if [[ -n "${ADDITIONAL_REDIRECT_URL}" ]]; then
  export SUPABASE_ADDITIONAL_REDIRECT_URL="${ADDITIONAL_REDIRECT_URL}"
fi

echo "[sync-supabase-auth] project=${PROJECT_REF} site_url=${SITE_URL}"

if [[ "${DRY_RUN}" == true ]]; then
  echo "[dry-run] would: supabase link + supabase config push"
  exit 0
fi

load_email_config_for_push() {
  local config_file="${SUPABASE_DIR}/config.toml"
  local backup="${SUPABASE_DIR}/.config.toml.tokenized.bak"
  local push_config="${SUPABASE_DIR}/.config.toml.push"
  local pers_file="${REPO_ROOT}/supabase/templates/.personalization.json"

  if [[ ! -f "${pers_file}" ]]; then
    echo "Error: ${pers_file} not found (required to materialize __PRODUCT_NAME__ subjects)." >&2
    exit 1
  fi

  cp "${config_file}" "${backup}"
  node "${SCRIPT_DIR}/materialize-email-config.mjs" \
    --config "${config_file}" \
    --personalization "${pers_file}" \
    --output "${push_config}"
  cp "${push_config}" "${config_file}"
}

restore_tokenized_config() {
  local config_file="${SUPABASE_DIR}/config.toml"
  local backup="${SUPABASE_DIR}/.config.toml.tokenized.bak"
  if [[ -f "${backup}" ]]; then
    mv -f "${backup}" "${config_file}"
  fi
  rm -f "${SUPABASE_DIR}/.config.toml.push"
}

trap restore_tokenized_config EXIT

load_email_config_for_push

cd "${SUPABASE_DIR}"
supabase link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}" --yes
supabase config push --yes
echo "[sync-supabase-auth] config push complete for ${PROJECT_REF}"
