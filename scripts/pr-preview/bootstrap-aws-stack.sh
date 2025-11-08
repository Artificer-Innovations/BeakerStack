#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/infra/aws/pr-preview-stack.yml"
FUNCTION_SOURCE="${REPO_ROOT}/infra/aws/functions/SubdomainFolders.js"
ERROR_PAGE_PATH="${REPO_ROOT}/infra/aws/error.html"
BUILD_DIR="${REPO_ROOT}/.aws-build"

DEFAULT_STACK_NAME="beakerstack-pr-preview"
DEFAULT_REGION="us-east-1"
DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_PRODUCTION_PREFIX="production"
DEFAULT_S3_ENCRYPTION="true"

STACK_NAME="${DEFAULT_STACK_NAME}"
AWS_REGION="${DEFAULT_REGION}"
AWS_PROFILE=""
DOMAIN_NAME=""
HOSTED_ZONE_ID=""
CERTIFICATE_ARN=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
PRODUCTION_PREFIX="${DEFAULT_PRODUCTION_PREFIX}"
WEBSITE_BUCKET_OVERRIDE=""
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
  --preview-prefix PREFIX        Prefix for preview folders/subdomains (default: ${DEFAULT_PREVIEW_PREFIX})
  --production-prefix PREFIX     Folder for production assets (default: ${DEFAULT_PRODUCTION_PREFIX})
  --website-bucket NAME          Override S3 bucket name for assets
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
  local rendered_path="${BUILD_DIR}/SubdomainFolders.rendered.js"

  if [[ ! -f "${FUNCTION_SOURCE}" ]]; then
    log "WARN" "CloudFront function source not found at ${FUNCTION_SOURCE}; skipping render."
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 unavailable; cannot render CloudFront function template."
    return 0
  fi

  local rendered
  rendered="$(python3 - "$FUNCTION_SOURCE" "$rendered_path" "$DOMAIN_NAME" "$PREVIEW_PREFIX" "$PRODUCTION_PREFIX" <<'PYTHON'
import sys

source_path, dest_path, domain, preview_prefix, production_prefix = sys.argv[1:]
with open(source_path, "r", encoding="utf-8") as fp:
    content = fp.read()

content = (
    content.replace("%%DOMAIN_NAME%%", domain)
    .replace("%%PREVIEW_PREFIX%%", preview_prefix)
    .replace("%%PRODUCTION_PREFIX%%", production_prefix)
)

with open(dest_path, "w", encoding="utf-8") as fp:
    fp.write(content)

print(dest_path)
PYTHON
)"
  rendered="${rendered%$'\n'}"
  log "INFO" "Rendered CloudFront function source to ${rendered}"
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
      --production-prefix)
        PRODUCTION_PREFIX="$2"
        shift 2
        ;;
      --website-bucket)
        WEBSITE_BUCKET_OVERRIDE="$2"
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
    "ProductionPrefix=${PRODUCTION_PREFIX}"
    "EnableS3BucketEncryption=${ENABLE_S3_ENCRYPTION}"
  )

  if [[ -n "${WEBSITE_BUCKET_OVERRIDE}" ]]; then
    PARAMETER_OVERRIDES+=("WebsiteBucketName=${WEBSITE_BUCKET_OVERRIDE}")
  fi

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
  local describe_args=(
    "${aws_cli[@]}" cloudformation describe-stacks
    --stack-name "${STACK_NAME}"
  )
  fetch_output() {
    local key="$1"
    "${aws_cli[@]}" cloudformation describe-stacks \
      --stack-name "${STACK_NAME}" \
      --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue" \
      --output text
  }

  local website_bucket logs_bucket distribution_id distribution_domain function_arn
  local preview_prefix_output production_prefix_output

  website_bucket="$(fetch_output "WebsiteBucketName")"
  logs_bucket="$(fetch_output "LogsBucketName")"
  distribution_id="$(fetch_output "CloudFrontDistributionId")"
  distribution_domain="$(fetch_output "CloudFrontDomainName")"
  function_arn="$(fetch_output "CloudFrontFunctionArn")"
  preview_prefix_output="$(fetch_output "PreviewPrefixOutput")"
  production_prefix_output="$(fetch_output "ProductionPrefixOutput")"

  log "INFO" "Uploading error page to s3://${website_bucket}/error.html"
  "${aws_cli[@]}" s3 cp "${ERROR_PAGE_PATH}" "s3://${website_bucket}/error.html" \
    --content-type text/html

  write_exports "PR_PREVIEW_WEBSITE_BUCKET" "${website_bucket}"
  write_exports "PR_PREVIEW_LOGS_BUCKET" "${logs_bucket}"
  write_exports "PR_PREVIEW_DISTRIBUTION_ID" "${distribution_id}"
  write_exports "PR_PREVIEW_CLOUDFRONT_DOMAIN" "https://${distribution_domain}"
  write_exports "PR_PREVIEW_FUNCTION_ARN" "${function_arn}"
  write_exports "PR_PREVIEW_PREFIX" "${preview_prefix_output}"
  write_exports "PR_PRODUCTION_PREFIX" "${production_prefix_output}"

  log "INFO" "Stack deployment complete."
  log "INFO" "Website bucket: ${website_bucket}"
  log "INFO" "CloudFront distribution: ${distribution_domain} (${distribution_id})"
}

main "$@"

