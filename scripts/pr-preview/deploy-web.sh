#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_APP_DIR="${REPO_ROOT}/apps/web"
BUILD_DIR="${WEB_APP_DIR}/dist"

DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_AWS_REGION="${AWS_REGION:-us-east-1}"
DEFAULT_WAIT_FOR_INVALIDATION=false

PR_NUMBER=""
S3_BUCKET=""
CLOUDFRONT_DISTRIBUTION_ID=""
DOMAIN_NAME=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
AWS_REGION="${DEFAULT_AWS_REGION}"
SKIP_BUILD=false
WAIT_FOR_INVALIDATION="${DEFAULT_WAIT_FOR_INVALIDATION}"
OUTPUT_ENV=""
DRY_RUN=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Builds and deploys the web application to an S3 prefix for PR previews, then
invalidates CloudFront and verifies the preview URL.

Required:
  --pr-number NUMBER             GitHub pull request number
  --bucket NAME                  Target S3 bucket (must match CloudFormation output)
  --distribution-id ID           CloudFront distribution ID to invalidate
  --domain DOMAIN                Root domain (e.g. beakerstack.com) used for preview URLs

Optional:
  --preview-prefix PREFIX        Prefix for preview folders/subdomains (default: ${DEFAULT_PREVIEW_PREFIX})
  --region REGION                AWS region for S3 operations (default: ${DEFAULT_AWS_REGION})
  --skip-build                   Assume the web app is already built locally
  --wait-for-invalidation        Poll CloudFront until invalidation completes
  --env-file PATH                Write outputs as KEY=VALUE to PATH
  --dry-run                      Print commands without executing
  --help                         Show this help message

Environment variables:
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
  AWS_REGION (overrides --region)

Outputs:
  PREVIEW_WEB_URL                HTTPS URL for the deployed preview
  PREVIEW_S3_PREFIX              S3 prefix used for the deployment
EOF
}

log() {
  local level="$1"
  shift
  printf '[%-5s] %s\n' "${level}" "$*"
}

run_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "$*"
  else
    "$@"
  fi
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
    log "ERROR" "aws CLI is required."
    exit 1
  }
  command -v npm >/dev/null 2>&1 || {
    log "ERROR" "npm is required."
    exit 1
  }
  command -v jq >/dev/null 2>&1 || {
    log "WARN" "jq not found; invalidation polling will use aws CLI output only."
  }
  command -v curl >/dev/null 2>&1 || {
    log "ERROR" "curl is required to verify preview URL."
    exit 1
  }
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
      --distribution-id)
        CLOUDFRONT_DISTRIBUTION_ID="$2"
        shift 2
        ;;
      --domain)
        DOMAIN_NAME="$2"
        shift 2
        ;;
      --preview-prefix)
        PREVIEW_PREFIX="$2"
        shift 2
        ;;
      --region)
        AWS_REGION="$2"
        shift 2
        ;;
      --skip-build)
        SKIP_BUILD=true
        shift
        ;;
      --wait-for-invalidation)
        WAIT_FOR_INVALIDATION=true
        shift
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

  if [[ -z "${S3_BUCKET}" ]]; then
    log "ERROR" "--bucket is required."
    exit 1
  fi

  if [[ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]]; then
    log "ERROR" "--distribution-id is required."
    exit 1
  fi

  if [[ -z "${DOMAIN_NAME}" ]]; then
    log "ERROR" "--domain is required."
    exit 1
  fi
}

build_web_app() {
  if [[ "${SKIP_BUILD}" == true ]]; then
    log "INFO" "Skipping web build (--skip-build provided)."
    return
  fi

  log "INFO" "Building web application..."
  run_cmd npm run --workspace web build
}

sync_to_s3() {
  local prefix="${PREVIEW_PREFIX}${PR_NUMBER}"
  local s3_uri="s3://${S3_BUCKET}/${prefix}"

  if [[ ! -d "${BUILD_DIR}" ]]; then
    log "ERROR" "Build output not found at ${BUILD_DIR}. Run build step first or pass --skip-build with pre-populated artifacts."
    exit 1
  fi

  log "INFO" "Syncing assets (excluding index.html) to ${s3_uri} with long cache TTL..."
  run_cmd aws s3 sync "${BUILD_DIR}/" "${s3_uri}/" \
    --delete \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable" \
    --content-type-auto \
    --region "${AWS_REGION}"

  log "INFO" "Ensuring SPA fallback (index.html) is cached with short TTL..."
  run_cmd aws s3 cp "${BUILD_DIR}/index.html" "${s3_uri}/index.html" \
    --cache-control "public,max-age=60" \
    --content-type "text/html; charset=utf-8" \
    --region "${AWS_REGION}"
  
  log "INFO" "Verifying favicon files are deployed..."
  local favicon_files=("favicon.ico" "favicon-16x16.png" "favicon-32x32.png" "apple-touch-icon.png" "android-chrome-192x192.png" "android-chrome-512x512.png")
  for favicon in "${favicon_files[@]}"; do
    if [[ -f "${BUILD_DIR}/${favicon}" ]]; then
      log "INFO" "  ✓ ${favicon} present in build output"
    else
      log "WARN" "  ✗ ${favicon} missing from build output"
    fi
  done

  write_output "PREVIEW_S3_PREFIX" "${prefix}"
}

create_invalidation() {
  local path="/${PREVIEW_PREFIX}${PR_NUMBER}/*"
  log "INFO" "Creating CloudFront invalidation for path ${path}..."

  local invalidation_id
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths \"${path}\""
    return 0
  fi

  invalidation_id="$(aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "${path}" \
    --query 'Invalidation.Id' \
    --output text)"

  log "INFO" "Invalidation submitted: ${invalidation_id}"

  if [[ "${WAIT_FOR_INVALIDATION}" != true ]]; then
    return 0
  fi

  log "INFO" "Waiting for invalidation ${invalidation_id} to complete..."
  aws cloudfront wait invalidation-completed \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --id "${invalidation_id}"
  log "INFO" "Invalidation completed."
}

verify_preview_url() {
  local host="${PREVIEW_PREFIX}${PR_NUMBER}.${DOMAIN_NAME}"
  local url="https://${host}/"

  log "INFO" "Verifying preview availability at ${url}..."
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "curl --fail --silent --show-error --head ${url}"
    write_output "PREVIEW_WEB_URL" "${url}"
    return
  fi

  if curl --fail --silent --show-error --head "${url}" >/dev/null; then
    log "INFO" "Preview responded successfully."
    write_output "PREVIEW_WEB_URL" "${url}"
  else
    log "WARN" "Preview URL did not respond successfully yet. It may take a few minutes to propagate: ${url}"
    write_output "PREVIEW_WEB_URL" "${url}"
  fi
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled. Commands will not be executed."
  fi

  build_web_app
  sync_to_s3
  create_invalidation
  verify_preview_url

  log "INFO" "Web preview deployment completed."
}

main "$@"

