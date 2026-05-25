#!/usr/bin/env bash
# Link preview Supabase, set Edge secrets, deploy billing + waitlist + Kit functions.
# Retries transient Supabase API failures (e.g. 504 on project status).
#
# Required environment:
#   SUPABASE_PREVIEW_PROJECT_REF (or SUPABASE_PROJECT_REF)
#   SUPABASE_PREVIEW_DB_PASSWORD (or SUPABASE_DB_PASSWORD)
#   PREVIEW_STRIPE_SECRET_KEY (or STRIPE_SECRET_KEY)
#   PREVIEW_STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET)
#   PREVIEW_SUPABASE_URL (or BILLING_SUPABASE_URL)
#   PREVIEW_SUPABASE_ANON_KEY (or BILLING_SUPABASE_ANON_KEY)
#   PR_TESTING_SUPABASE_SERVICE_ROLE_KEY (or BILLING_SUPABASE_SERVICE_ROLE_KEY)
# Optional:
#   PREVIEW_BILLING_ALLOWED_ORIGINS (default https://deploy.beakerstack.com)
#   KIT_API_KEY / KIT_CRON_SECRET / KIT_WEBHOOK_SECRET (shared; legacy PREVIEW_KIT_* fallback)
#   SUPABASE_MAX_RETRIES (default 5)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/supabase-retry.sh
source "${SCRIPT_DIR}/lib/supabase-retry.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PROJECT_REF="${SUPABASE_PREVIEW_PROJECT_REF:-${SUPABASE_PROJECT_REF:-}}"
DB_PASSWORD="${SUPABASE_PREVIEW_DB_PASSWORD:-${SUPABASE_DB_PASSWORD:-}}"
STRIPE_SK="${PREVIEW_STRIPE_SECRET_KEY:-${STRIPE_SECRET_KEY:-}}"
STRIPE_WHSEC="${PREVIEW_STRIPE_WEBHOOK_SECRET:-${STRIPE_WEBHOOK_SECRET:-}}"
BILLING_URL="${PREVIEW_SUPABASE_URL:-${BILLING_SUPABASE_URL:-}}"
BILLING_ANON="${PREVIEW_SUPABASE_ANON_KEY:-${BILLING_SUPABASE_ANON_KEY:-}}"
BILLING_SERVICE="${PR_TESTING_SUPABASE_SERVICE_ROLE_KEY:-${BILLING_SUPABASE_SERVICE_ROLE_KEY:-}}"
BILLING_ORIGINS="${PREVIEW_BILLING_ALLOWED_ORIGINS:-${BILLING_ALLOWED_ORIGINS:-https://deploy.beakerstack.com}}"
KIT_API_KEY="${KIT_API_KEY:-${PREVIEW_KIT_API_KEY:-}}"
KIT_CRON_SECRET="${KIT_CRON_SECRET:-${PREVIEW_KIT_CRON_SECRET:-}}"
KIT_WEBHOOK_SECRET="${KIT_WEBHOOK_SECRET:-${PREVIEW_KIT_WEBHOOK_SECRET:-}}"

missing=()
[[ -n "${PROJECT_REF}" ]] || missing+=("SUPABASE_PREVIEW_PROJECT_REF")
[[ -n "${DB_PASSWORD}" ]] || missing+=("SUPABASE_PREVIEW_DB_PASSWORD")
[[ -n "${STRIPE_SK}" ]] || missing+=("PREVIEW_STRIPE_SECRET_KEY")
[[ -n "${STRIPE_WHSEC}" ]] || missing+=("PREVIEW_STRIPE_WEBHOOK_SECRET")
[[ -n "${BILLING_URL}" ]] || missing+=("PREVIEW_SUPABASE_URL")
[[ -n "${BILLING_ANON}" ]] || missing+=("PREVIEW_SUPABASE_ANON_KEY")
[[ -n "${BILLING_SERVICE}" ]] || missing+=("PR_TESTING_SUPABASE_SERVICE_ROLE_KEY")

if ((${#missing[@]} > 0)); then
  log "ERROR" "Missing required env: ${missing[*]}"
  exit 1
fi

cd "${REPO_ROOT}/supabase"

supabase_run "Link preview Supabase project" \
  supabase link \
  --project-ref "${PROJECT_REF}" \
  --password "${DB_PASSWORD}" \
  --yes

supabase_run "Set preview billing Edge secrets" \
  supabase secrets set \
  STRIPE_SECRET_KEY="${STRIPE_SK}" \
  STRIPE_WEBHOOK_SECRET="${STRIPE_WHSEC}" \
  BILLING_SUPABASE_URL="${BILLING_URL}" \
  BILLING_SUPABASE_ANON_KEY="${BILLING_ANON}" \
  BILLING_SUPABASE_SERVICE_ROLE_KEY="${BILLING_SERVICE}" \
  BILLING_ALLOWED_ORIGINS="${BILLING_ORIGINS}"

[[ -n "${KIT_API_KEY}" ]] && supabase_run "Set KIT_API_KEY" \
  supabase secrets set KIT_API_KEY="${KIT_API_KEY}"
[[ -n "${KIT_CRON_SECRET}" ]] && supabase_run "Set KIT_CRON_SECRET" \
  supabase secrets set KIT_CRON_SECRET="${KIT_CRON_SECRET}"
[[ -n "${KIT_WEBHOOK_SECRET}" ]] && supabase_run "Set KIT_WEBHOOK_SECRET" \
  supabase secrets set KIT_WEBHOOK_SECRET="${KIT_WEBHOOK_SECRET}"

supabase_run "Deploy preview edge functions" \
  supabase functions deploy stripe-webhook billing-stripe waitlist-capture waitlist-ops kit-sync kit-webhook \
  --project-ref "${PROJECT_REF}"

log "INFO" "Preview edge functions deployed for project ${PROJECT_REF}"
