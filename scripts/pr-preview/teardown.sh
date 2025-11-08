#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_CHANNEL_PREFIX="pr-"
DEFAULT_AWS_REGION="${AWS_REGION:-us-east-1}"

PR_NUMBER=""
S3_BUCKET=""
AWS_REGION="${DEFAULT_AWS_REGION}"
CLOUDFRONT_DISTRIBUTION_ID=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
SUPABASE_DB_URL="${SUPABASE_PREVIEW_DB_URL:-}"
SUPABASE_SCHEMA=""
EXPO_ACCOUNT=""
EXPO_PROJECT_SLUG="beaker-stack"
CHANNEL_PREFIX="${DEFAULT_CHANNEL_PREFIX}"
OUTPUT_ENV=""
DRY_RUN=false

EAS_BIN=(npx --yes eas-cli)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Cleanup helper for PR preview environments. Deletes the S3 artifact prefix,
invalidates CloudFront caches, drops the Supabase preview schema, and removes
Expo channels associated with the PR.

Required:
  --pr-number NUMBER             Pull request number (used to derive prefixes)

Optional:
  --bucket NAME                  S3 bucket that stores preview assets
  --preview-prefix PREFIX        Folder/subdomain prefix (default: ${DEFAULT_PREVIEW_PREFIX})
  --distribution-id ID           CloudFront distribution to invalidate
  --region REGION                AWS region for S3/CloudFront (default: ${DEFAULT_AWS_REGION})
  --supabase-db-url URL          Postgres connection string for preview database/schema
  --supabase-schema NAME         Schema to drop (default: preview_pr_<number>)
  --expo-account SLUG            Expo account (required if removing Expo channel)
  --expo-project SLUG            Expo project slug (default: beaker-stack)
  --channel-prefix PREFIX        Expo channel prefix (default: ${DEFAULT_CHANNEL_PREFIX})
  --env-file PATH                Append outputs to PATH in KEY=VALUE format
  --dry-run                      Print actions without executing
  --help                         Show this message

Environment variables:
  SUPABASE_PREVIEW_DB_URL        Default for --supabase-db-url
  EXPO_TOKEN                     Required to remove Expo channels (if provided)
EOF
}

log() {
  local level="$1"
  shift
  printf '[%-5s] %s\n' "${level}" "$*"
}

write_output() {
  local key="$1"
  local value="$2"

  if [[ -n "${OUTPUT_ENV}" ]]; then
    mkdir -p "$(dirname "${OUTPUT_ENV}")"
    printf '%s=%s\n' "${key}" "${value}" >>"${OUTPUT_ENV}"
  fi

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      printf '%s<<EOF\n' "${key}"
      printf '%s\n' "${value}"
      printf 'EOF\n'
    } >>"${GITHUB_OUTPUT}"
  fi
}

ensure_prereqs() {
  command -v aws >/dev/null 2>&1 || {
    log "WARN" "aws CLI not found; skipping S3/CloudFront cleanup."
    S3_BUCKET=""
    CLOUDFRONT_DISTRIBUTION_ID=""
  }

  if [[ -n "${SUPABASE_DB_URL}" ]] && ! command -v psql >/dev/null 2>&1; then
    log "WARN" "psql not found; Supabase schema cleanup will be skipped."
    SUPABASE_DB_URL=""
  }

  if [[ -n "${EXPO_ACCOUNT}" ]]; then
    command -v npx >/dev/null 2>&1 || {
      log "WARN" "npx not found; Expo cleanup skipped."
      EXPO_ACCOUNT=""
    }
    command -v jq >/dev/null 2>&1 || {
      log "WARN" "jq not found; Expo cleanup skipped."
      EXPO_ACCOUNT=""
    }
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pr-number)
        PR_NUMBER="$2"
        shift 2
        ;;
      --bucket)
        S3_BUCKET="$2"
        shift 2
        ;;
      --preview-prefix)
        PREVIEW_PREFIX="$2"
        shift 2
        ;;
      --distribution-id)
        CLOUDFRONT_DISTRIBUTION_ID="$2"
        shift 2
        ;;
      --region)
        AWS_REGION="$2"
        shift 2
        ;;
      --supabase-db-url)
        SUPABASE_DB_URL="$2"
        shift 2
        ;;
      --supabase-schema)
        SUPABASE_SCHEMA="$2"
        shift 2
        ;;
      --expo-account)
        EXPO_ACCOUNT="$2"
        shift 2
        ;;
      --expo-project)
        EXPO_PROJECT_SLUG="$2"
        shift 2
        ;;
      --channel-prefix)
        CHANNEL_PREFIX="$2"
        shift 2
        ;;
      --env-file)
        OUTPUT_ENV="$2"
        : >"${OUTPUT_ENV}"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        log "ERROR" "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "${PR_NUMBER}" ]]; then
    log "ERROR" "--pr-number is required."
    exit 1
  fi

  if [[ -z "${SUPABASE_SCHEMA}" ]]; then
    SUPABASE_SCHEMA="preview_pr_${PR_NUMBER}"
  fi
}

run_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "$*"
  else
    "$@"
  fi
}

preview_prefix() {
  printf '%s%s' "${PREVIEW_PREFIX}" "${PR_NUMBER}"
}

channel_name() {
  printf '%s%s' "${CHANNEL_PREFIX}" "${PR_NUMBER}"
}

cleanup_s3() {
  if [[ -z "${S3_BUCKET}" ]]; then
    return
  fi

  local prefix s3_uri
  prefix="$(preview_prefix)"
  s3_uri="s3://${S3_BUCKET}/${prefix}"
  log "INFO" "Removing S3 objects at ${s3_uri}/..."
  run_cmd aws s3 rm "${s3_uri}/" --recursive --region "${AWS_REGION}" || log "WARN" "Failed to remove S3 prefix ${s3_uri}"

  write_output "TEARDOWN_S3_PREFIX" "${prefix}"
}

invalidate_cloudfront() {
  if [[ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]]; then
    return
  fi

  local path="/$(preview_prefix())/*"
  log "INFO" "Creating CloudFront invalidation for ${path}..."

  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths \"${path}\""
    return
  fi

  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "${path}" >/dev/null
}

cleanup_supabase() {
  if [[ -z "${SUPABASE_DB_URL}" ]]; then
    return
  fi

  log "INFO" "Dropping Supabase schema ${SUPABASE_SCHEMA}..."
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "psql \"${SUPABASE_DB_URL}\" -c \"DROP SCHEMA IF EXISTS \\\"${SUPABASE_SCHEMA}\\\" CASCADE;\""
    return
  fi

  psql "${SUPABASE_DB_URL}" \
    -c "DROP SCHEMA IF EXISTS \"${SUPABASE_SCHEMA}\" CASCADE;" >/dev/null || \
    log "WARN" "Failed to drop schema ${SUPABASE_SCHEMA}"
}

cleanup_expo() {
  if [[ -z "${EXPO_ACCOUNT}" ]]; then
    return
  fi

  local channel
  channel="$(channel_name)"

  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    log "WARN" "EXPO_TOKEN not set; skipping Expo cleanup."
    return
  fi

  log "INFO" "Removing Expo channel ${channel}..."
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "eas channel:edit ${channel} --remove-branch ${channel}"
    log "DRY" "eas channel:delete ${channel}"
    return
  fi

  EXPO_TOKEN="${EXPO_TOKEN}" "${EAS_BIN[@]}" channel:edit "${channel}" --remove-branch "${channel}" --non-interactive >/dev/null 2>&1 || true
  EXPO_TOKEN="${EXPO_TOKEN}" "${EAS_BIN[@]}" channel:delete "${channel}" --non-interactive >/dev/null 2>&1 || log "WARN" "Failed to delete channel ${channel} (it may already be removed)."

  write_output "TEARDOWN_EXPO_CHANNEL" "${channel}"
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled. No destructive actions will be performed."
  fi

  cleanup_s3
  invalidate_cloudfront
  cleanup_supabase
  cleanup_expo

  log "INFO" "Teardown complete for PR #${PR_NUMBER}."
}

main "$@"

