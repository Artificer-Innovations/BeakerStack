#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/infra/aws/pr-preview-stack.yml"
FUNCTION_SOURCE="${REPO_ROOT}/infra/aws/functions/PRPathRouter.js"
ERROR_PAGE_PATH="${REPO_ROOT}/infra/aws/error.html"
BUILD_DIR="${REPO_ROOT}/.aws-build"

DEFAULT_STACK_NAME="beakerstack-pr-preview"
DEFAULT_REGION="us-east-1"
DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_S3_ENCRYPTION="true"

STACK_NAME="${DEFAULT_STACK_NAME}"
AWS_REGION="${DEFAULT_REGION}"
AWS_PROFILE=""
DOMAIN_NAME=""
HOSTED_ZONE_ID=""
CERTIFICATE_ARN=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
LOGS_BUCKET_OVERRIDE=""
ENV_FILE=""
DRY_RUN=false
ENABLE_S3_ENCRYPTION="${DEFAULT_S3_ENCRYPTION}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Deploys or validates the AWS infrastructure stack for PR preview environments.

Required:
  --domain DOMAIN                Apex domain (e.g. beakerstack.com)
  --hosted-zone-id ID            Route53 hosted zone ID managing the domain
  --certificate-arn ARN          ACM certificate ARN (in us-east-1) for the domain and wildcard

Optional:
  --stack-name NAME              CloudFormation stack name (default: ${DEFAULT_STACK_NAME})
  --region REGION                AWS region for the stack (default: ${DEFAULT_REGION})
  --aws-profile PROFILE          AWS CLI profile to use
  --preview-prefix PREFIX        Prefix for preview folders (default: ${DEFAULT_PREVIEW_PREFIX})
  --logs-bucket NAME             Override S3 bucket name for access logs
  --disable-s3-encryption        Disable SSE-S3 encryption on buckets (defaults to enabled)
  --env-file PATH                Write stack outputs as KEY=VALUE to the given file
  --dry-run                      Create a changeset without executing it
  --help                         Show this help message

Environment exports:
  If GITHUB_OUTPUT is set, exported values are appended for downstream workflow steps.
EOF
}

log() {
  local level="$1"
  local message="$2"
  printf '[%-5s] %s\n' "${level}" "${message}"
}

abort() {
  log "ERROR" "$1"
  exit "${2:-1}"
}

ensure_prereqs() {
  command -v aws >/dev/null 2>&1 || abort "aws CLI is required but not installed."

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 not found; skipping rendered CloudFront function output."
  fi

  [[ -f "${TEMPLATE_PATH}" ]] || abort "Missing CloudFormation template at ${TEMPLATE_PATH}"
  [[ -f "${ERROR_PAGE_PATH}" ]] || abort "Missing error page template at ${ERROR_PAGE_PATH}"
}

render_function_template() {
  mkdir -p "${BUILD_DIR}"
  local rendered_path="${BUILD_DIR}/PRPathRouter.rendered.js"

  if [[ ! -f "${FUNCTION_SOURCE}" ]]; then
    log "WARN" "CloudFront function source not found at ${FUNCTION_SOURCE}; skipping render."
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 unavailable; cannot render CloudFront function template."
    return 0
  fi

  local rendered
  rendered="$(python3 - "$FUNCTION_SOURCE" "$rendered_path" "$PREVIEW_PREFIX" <<'PYTHON'
import sys

source_path, dest_path, preview_prefix = sys.argv[1:]
with open(source_path, "r", encoding="utf-8") as fp:
    content = fp.read()

content = content.replace("%%PREVIEW_PREFIX%%", preview_prefix)

with open(dest_path, "w", encoding="utf-8") as fp:
    fp.write(content)

print(dest_path)
PYTHON
)"
  rendered="${rendered%$'\n'}"
  log "INFO" "Rendered CloudFront function source to ${rendered}"
}

publish_pr_path_router_function() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "DRY RUN: Would publish PRPathRouter function"
    return 0
  fi

  local rendered_path="${BUILD_DIR}/PRPathRouter.rendered.js"
  if [[ ! -f "${rendered_path}" ]]; then
    log "WARN" "Rendered function not found at ${rendered_path}; skipping function publish."
    return 0
  fi

  local function_name="${STACK_NAME}-PRPathRouter"
  local function_code
  function_code="$(cat "${rendered_path}")"

  log "INFO" "Publishing CloudFront function: ${function_name}"

  local aws_cli=(aws --region "${AWS_REGION}")
  if [[ -n "${AWS_PROFILE}" ]]; then
    aws_cli+=(--profile "${AWS_PROFILE}")
  fi

  # Get the function ARN from stack outputs
  local function_arn
  function_arn="$("${aws_cli[@]}" cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='PRPathRouterFunctionArn'].OutputValue" \
    --output text 2>/dev/null || echo '')"

  if [[ -z "${function_arn}" ]]; then
    log "WARN" "Could not find PRPathRouter function ARN in stack outputs. Function may need to be created first."
    return 0
  fi

  # Extract function name from ARN (format: arn:aws:cloudfront::ACCOUNT:function/NAME/ETAG)
  local function_id="${function_arn##*/}"
  function_id="${function_id%%/*}"

  # Update the function code
  "${aws_cli[@]}" cloudfront update-function \
    --name "${function_id}" \
    --if-match "$("${aws_cli[@]}" cloudfront describe-function --name "${function_id}" --query 'ETag' --output text 2>/dev/null || echo '')" \
    --function-code "${function_code}" >/dev/null 2>&1 || {
    log "WARN" "Failed to update function ${function_id}. It may not exist yet or have been updated."
    return 0
  }

  # Publish the function
  "${aws_cli[@]}" cloudfront publish-function \
    --name "${function_id}" \
    --if-match "$("${aws_cli[@]}" cloudfront describe-function --name "${function_id}" --query 'ETag' --output text 2>/dev/null || echo '')" >/dev/null 2>&1 || {
    log "WARN" "Failed to publish function ${function_id}."
    return 0
  }

  log "INFO" "Successfully published CloudFront function: ${function_id}"
}

write_exports() {
  local key="$1"
  local value="$2"

  if [[ -n "${ENV_FILE}" ]]; then
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
  fi

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      printf '%s<<EOF\n' "${key}"
      printf '%s\n' "${value}"
      printf 'EOF\n'
    } >>"${GITHUB_OUTPUT}"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain)
        DOMAIN_NAME="$2"
        shift 2
        ;;
      --hosted-zone-id)
        HOSTED_ZONE_ID="$2"
        shift 2
        ;;
      --certificate-arn)
        CERTIFICATE_ARN="$2"
        shift 2
        ;;
      --stack-name)
        STACK_NAME="$2"
        shift 2
        ;;
      --region)
        AWS_REGION="$2"
        shift 2
        ;;
      --aws-profile)
        AWS_PROFILE="$2"
        shift 2
        ;;
      --preview-prefix)
        PREVIEW_PREFIX="$2"
        shift 2
        ;;
      --logs-bucket)
        LOGS_BUCKET_OVERRIDE="$2"
        shift 2
        ;;
      --env-file)
        ENV_FILE="$2"
        mkdir -p "$(dirname "${ENV_FILE}")"
        : >"${ENV_FILE}"
        shift 2
        ;;
      --disable-s3-encryption)
        ENABLE_S3_ENCRYPTION="false"
        shift
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
        abort "Unknown argument: $1"
        ;;
    esac
  done

  [[ -n "${DOMAIN_NAME}" ]] || abort "--domain is required"
  [[ -n "${HOSTED_ZONE_ID}" ]] || abort "--hosted-zone-id is required"
  [[ -n "${CERTIFICATE_ARN}" ]] || abort "--certificate-arn is required"
}

build_parameter_overrides() {
  PARAMETER_OVERRIDES=(
    "DomainName=${DOMAIN_NAME}"
    "HostedZoneId=${HOSTED_ZONE_ID}"
    "CertificateArn=${CERTIFICATE_ARN}"
    "PreviewPrefix=${PREVIEW_PREFIX}"
    "EnableS3BucketEncryption=${ENABLE_S3_ENCRYPTION}"
  )

  if [[ -n "${LOGS_BUCKET_OVERRIDE}" ]]; then
    PARAMETER_OVERRIDES+=("LogsBucketName=${LOGS_BUCKET_OVERRIDE}")
  fi
}

main() {
  parse_args "$@"
  ensure_prereqs
  render_function_template || true
  build_parameter_overrides

  local aws_cli=(aws --region "${AWS_REGION}")
  if [[ -n "${AWS_PROFILE}" ]]; then
    aws_cli+=(--profile "${AWS_PROFILE}")
  fi

  log "INFO" "Validating CloudFormation template..."
  "${aws_cli[@]}" cloudformation validate-template \
    --template-body "file://${TEMPLATE_PATH}" >/dev/null

  local deploy_cmd=(
    "${aws_cli[@]}" cloudformation deploy
    --template-file "${TEMPLATE_PATH}"
    --stack-name "${STACK_NAME}"
    --capabilities CAPABILITY_NAMED_IAM
    --parameter-overrides "${PARAMETER_OVERRIDES[@]}"
  )

  if [[ "${DRY_RUN}" == true ]]; then
    deploy_cmd+=(--no-execute-changeset)
    log "INFO" "Running dry-run deployment for stack ${STACK_NAME}..."
  else
    log "INFO" "Deploying stack ${STACK_NAME}..."
  fi

  "${deploy_cmd[@]}"

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run completed. No resources were updated."
    exit 0
  fi

  log "INFO" "Fetching stack outputs..."
  fetch_output() {
    local key="$1"
    "${aws_cli[@]}" cloudformation describe-stacks \
      --stack-name "${STACK_NAME}" \
      --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue" \
      --output text
  }

  local prod_bucket staging_bucket deploy_bucket logs_bucket
  local prod_dist_id staging_dist_id deploy_dist_id
  local prod_dist_domain staging_dist_domain deploy_dist_domain
  local function_arn preview_prefix_output

  prod_bucket="$(fetch_output "ProdBucketName")"
  staging_bucket="$(fetch_output "StagingBucketName")"
  deploy_bucket="$(fetch_output "DeployBucketName")"
  logs_bucket="$(fetch_output "LogsBucketName")"
  prod_dist_id="$(fetch_output "ProdDistributionId")"
  staging_dist_id="$(fetch_output "StagingDistributionId")"
  deploy_dist_id="$(fetch_output "DeployDistributionId")"
  prod_dist_domain="$(fetch_output "ProdDistributionDomainName")"
  staging_dist_domain="$(fetch_output "StagingDistributionDomainName")"
  deploy_dist_domain="$(fetch_output "DeployDistributionDomainName")"
  function_arn="$(fetch_output "PRPathRouterFunctionArn")"
  preview_prefix_output="$(fetch_output "PreviewPrefixOutput")"

  # Upload error page to all three buckets
  for bucket in "${prod_bucket}" "${staging_bucket}" "${deploy_bucket}"; do
    if [[ -n "${bucket}" && "${bucket}" != "None" ]]; then
      log "INFO" "Uploading error page to s3://${bucket}/error.html"
      "${aws_cli[@]}" s3 cp "${ERROR_PAGE_PATH}" "s3://${bucket}/error.html" \
        --content-type text/html || log "WARN" "Failed to upload error page to ${bucket}"
    fi
  done

  # Publish the PRPathRouter function with rendered code
  publish_pr_path_router_function

  # Export outputs for PR preview workflow (use deploy environment)
  write_exports "PR_PREVIEW_WEBSITE_BUCKET" "${deploy_bucket}"
  write_exports "PR_PREVIEW_LOGS_BUCKET" "${logs_bucket}"
  write_exports "PR_PREVIEW_DISTRIBUTION_ID" "${deploy_dist_id}"
  write_exports "PR_PREVIEW_CLOUDFRONT_DOMAIN" "https://${deploy_dist_domain}"
  write_exports "PR_PREVIEW_FUNCTION_ARN" "${function_arn}"
  write_exports "PR_PREVIEW_PREFIX" "${preview_prefix_output}"

  # Export all bucket names and distribution IDs for reference
  write_exports "PROD_BUCKET_NAME" "${prod_bucket}"
  write_exports "STAGING_BUCKET_NAME" "${staging_bucket}"
  write_exports "DEPLOY_BUCKET_NAME" "${deploy_bucket}"
  write_exports "PROD_DISTRIBUTION_ID" "${prod_dist_id}"
  write_exports "STAGING_DISTRIBUTION_ID" "${staging_dist_id}"
  write_exports "DEPLOY_DISTRIBUTION_ID" "${deploy_dist_id}"

  log "INFO" "Stack deployment complete."
  log "INFO" "Production bucket: ${prod_bucket} (${prod_dist_domain})"
  log "INFO" "Staging bucket: ${staging_bucket} (${staging_dist_domain})"
  log "INFO" "Deploy/Preview bucket: ${deploy_bucket} (${deploy_dist_domain})"
}

main "$@"

