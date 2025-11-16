#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_APP_DIR="${REPO_ROOT}/apps/web"
BUILD_DIR="${WEB_APP_DIR}/dist"

DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_AWS_REGION="${AWS_REGION:-us-east-1}"
DEFAULT_WAIT_FOR_INVALIDATION=false
DEFAULT_ENVIRONMENT="preview"

PR_NUMBER=""
S3_BUCKET=""
CLOUDFRONT_DISTRIBUTION_ID=""
DOMAIN_NAME=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
AWS_REGION="${DEFAULT_AWS_REGION}"
ENVIRONMENT="${DEFAULT_ENVIRONMENT}"  # prod|staging|preview
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
  --bucket NAME                  Target S3 bucket (must match CloudFormation output)
  --distribution-id ID           CloudFront distribution ID to invalidate
  --domain DOMAIN                Root domain (e.g. beakerstack.com) used for preview URLs

Optional:
  --pr-number NUMBER             GitHub pull request number (required for preview environment)
  --environment ENV              Deployment environment: prod|staging|preview (default: ${DEFAULT_ENVIRONMENT})
  --preview-prefix PREFIX        Prefix for preview folders (default: ${DEFAULT_PREVIEW_PREFIX})
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
  VITE_BASE_PATH                 Base path used during build

Environment variables for build:
  VITE_BASE_PATH                 Base path for React Router (set automatically based on --environment)
  VITE_SUPABASE_URL              Supabase API URL (should be set externally)
  VITE_SUPABASE_ANON_KEY         Supabase anon key (should be set externally)
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
      --environment)
        ENVIRONMENT="$2"
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

  # Validate environment
  if [[ "${ENVIRONMENT}" != "prod" && "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "preview" ]]; then
    log "ERROR" "--environment must be one of: prod, staging, preview"
    exit 1
  fi

  # PR number required for preview environment
  if [[ "${ENVIRONMENT}" == "preview" && -z "${PR_NUMBER}" ]]; then
    log "ERROR" "--pr-number is required for preview environment."
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

determine_base_path() {
  case "${ENVIRONMENT}" in
    preview)
      if [[ -z "${PR_NUMBER}" ]]; then
        log "ERROR" "PR_NUMBER is required for preview environment"
        exit 1
      fi
      echo "/${PREVIEW_PREFIX}${PR_NUMBER}"
      ;;
    prod|staging)
      echo "/"
      ;;
    *)
      log "ERROR" "Unknown environment: ${ENVIRONMENT}"
      exit 1
      ;;
  esac
}

build_web_app() {
  if [[ "${SKIP_BUILD}" == true ]]; then
    log "INFO" "Skipping web build (--skip-build provided)."
    return
  fi

  local base_path
  base_path="$(determine_base_path)"
  
  log "INFO" "Preparing static assets..."
  # Ensure public directory exists and has required assets
  # These scripts sync icons from assets/ to apps/web/public/ and generate favicons
  log "INFO" "Syncing icon assets to web public directory..."
  run_cmd npm run sync-icons
  
  log "INFO" "Generating favicon files..."
  run_cmd npm run generate-favicons
  
  log "INFO" "Building web application for environment: ${ENVIRONMENT}"
  log "INFO" "Using VITE_BASE_PATH=${base_path}"

  # Set VITE_BASE_PATH for the build
  export VITE_BASE_PATH="${base_path}"
  
  run_cmd npm run --workspace web build
  
  # Verify build output contains expected files
  log "INFO" "Verifying build output..."
  if [[ ! -d "${BUILD_DIR}" ]]; then
    log "ERROR" "Build directory ${BUILD_DIR} was not created!"
    exit 1
  fi
  
  # Check for critical files that should always be present
  local required_files=("index.html" "assets")
  local missing_required=()
  for file in "${required_files[@]}"; do
    if [[ ! -e "${BUILD_DIR}/${file}" ]]; then
      missing_required+=("${file}")
    fi
  done
  
  if [[ ${#missing_required[@]} -gt 0 ]]; then
    log "ERROR" "Build output missing required files: ${missing_required[*]}"
    exit 1
  fi
  
  # List all files in build output for debugging
  log "INFO" "Build output contents:"
  find "${BUILD_DIR}" -maxdepth 1 -type f | sort | while read -r file; do
    log "INFO" "  - $(basename "${file}")"
  done || ls -1 "${BUILD_DIR}" | while read -r file; do
    log "INFO" "  - ${file}"
  done
  
  write_output "VITE_BASE_PATH" "${base_path}"
}

sync_to_s3() {
  local prefix
  local s3_uri

  if [[ ! -d "${BUILD_DIR}" ]]; then
    log "ERROR" "Build output not found at ${BUILD_DIR}. Run build step first or pass --skip-build with pre-populated artifacts."
    exit 1
  fi

  # Determine S3 prefix based on environment
  case "${ENVIRONMENT}" in
    preview)
      prefix="${PREVIEW_PREFIX}${PR_NUMBER}"
      s3_uri="s3://${S3_BUCKET}/${prefix}"
      ;;
    prod|staging)
      prefix=""
      s3_uri="s3://${S3_BUCKET}"
      ;;
    *)
      log "ERROR" "Unknown environment: ${ENVIRONMENT}"
      exit 1
      ;;
  esac

  log "INFO" "Syncing assets (excluding index.html) to ${s3_uri} with long cache TTL..."
  log "INFO" "Build directory contents:"
  if [[ -d "${BUILD_DIR}" ]]; then
    find "${BUILD_DIR}" -maxdepth 1 -type f -printf '%f\n' 2>/dev/null | while read -r file; do
      log "INFO" "  - ${file}"
    done || ls -1 "${BUILD_DIR}" | while read -r file; do
      log "INFO" "  - ${file}"
    done
  else
    log "ERROR" "Build directory ${BUILD_DIR} does not exist!"
    exit 1
  fi
  
  run_cmd aws s3 sync "${BUILD_DIR}/" "${s3_uri}/" \
    --delete \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable" \
    --region "${AWS_REGION}" \
    --exact-timestamps

  log "INFO" "Ensuring SPA fallback (index.html) is cached with short TTL..."
  run_cmd aws s3 cp "${BUILD_DIR}/index.html" "${s3_uri}/index.html" \
    --cache-control "public,max-age=60" \
    --content-type "text/html; charset=utf-8" \
    --region "${AWS_REGION}"
  
  log "INFO" "Verifying all static assets are deployed..."
  
  # Dynamically discover all static files in build output (excluding index.html and assets directory)
  local missing_files=()
  local verified_count=0
  local files_to_verify=()
  
  if [[ "${DRY_RUN}" != true ]]; then
    # First, collect all files to verify (excluding index.html and assets directory)
    # Use a more robust approach that handles edge cases
    if [[ -d "${BUILD_DIR}" ]]; then
      while IFS= read -r -d '' file; do
        # Get relative path from BUILD_DIR
        local rel_path="${file#${BUILD_DIR}/}"
        
        # Skip index.html (handled separately) and anything in assets/ directory
        if [[ "${rel_path}" == "index.html" ]] || [[ "${rel_path}" == assets/* ]]; then
          continue
        fi
        
        files_to_verify+=("${file}")
      done < <(find "${BUILD_DIR}" -type f -print0 2>/dev/null || true)
    fi
    
    # Verify each file exists in S3
    if [[ ${#files_to_verify[@]} -gt 0 ]]; then
      for file in "${files_to_verify[@]}"; do
        rel_path="${file#${BUILD_DIR}/}"
        
        # Verify file exists in S3
        if aws s3 ls "${s3_uri}/${rel_path}" --region "${AWS_REGION}" >/dev/null 2>&1; then
          ((verified_count++)) || true
          log "INFO" "  ✓ ${rel_path} confirmed in S3"
        else
          log "WARN" "  ✗ ${rel_path} missing from S3, uploading now..."
          missing_files+=("${rel_path}")
          if run_cmd aws s3 cp "${file}" "${s3_uri}/${rel_path}" \
            --cache-control "public,max-age=31536000,immutable" \
            --region "${AWS_REGION}"; then
            ((verified_count++)) || true
          else
            log "ERROR" "Failed to upload ${rel_path} to S3"
          fi
        fi
      done
    else
      log "WARN" "No files found to verify (excluding index.html and assets)"
    fi
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
      log "WARN" "The following files were missing from S3 and were uploaded: ${missing_files[*]}"
    else
      log "INFO" "All static assets verified in S3 (${verified_count} files)"
    fi
  else
    log "DRY" "Skipping S3 verification in dry-run mode"
  fi

  write_output "PREVIEW_S3_PREFIX" "${prefix:-/}"
}

create_invalidation() {
  local path
  
  # Determine invalidation path based on environment
  case "${ENVIRONMENT}" in
    preview)
      # For path-based routing, invalidate the PR path
      path="/${PREVIEW_PREFIX}${PR_NUMBER}/*"
      ;;
    prod|staging)
      # For prod/staging, invalidate all paths
      path="/*"
      ;;
    *)
      log "ERROR" "Unknown environment: ${ENVIRONMENT}"
      exit 1
      ;;
  esac

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
  local url
  
  # Determine URL based on environment
  case "${ENVIRONMENT}" in
    preview)
      # Path-based preview URL: https://deploy.beakerstack.com/pr-<N>/
      url="https://deploy.${DOMAIN_NAME}/${PREVIEW_PREFIX}${PR_NUMBER}/"
      ;;
    prod)
      url="https://${DOMAIN_NAME}/"
      ;;
    staging)
      url="https://staging.${DOMAIN_NAME}/"
      ;;
    *)
      log "ERROR" "Unknown environment: ${ENVIRONMENT}"
      exit 1
      ;;
  esac

  log "INFO" "Verifying deployment availability at ${url}..."
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "curl --fail --silent --show-error --head ${url}"
    write_output "PREVIEW_WEB_URL" "${url}"
    return
  fi

  if curl --fail --silent --show-error --head "${url}" >/dev/null; then
    log "INFO" "Deployment responded successfully."
    write_output "PREVIEW_WEB_URL" "${url}"
  else
    log "WARN" "Deployment URL did not respond successfully yet. It may take a few minutes to propagate: ${url}"
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

