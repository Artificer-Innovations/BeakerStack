#!/usr/bin/env bash
# Provisions CloudFront signed-cookie access control for PR preview and/or staging.
#
# What this script does:
#   1. Generates an RSA-2048 key pair (or accepts an existing PEM)
#   2. Uploads the public key to CloudFront
#   3. Updates the CloudFormation stack to create a key group and enable enforcement
#   4. Writes CLOUDFRONT_SIGNING_KEY + CLOUDFRONT_SIGNING_KEY_ID to GitHub Actions secrets
#
# Usage:
#   ./scripts/pr-preview/setup-signed-cookies.sh [options]
#
# Required IAM permissions for the calling credentials:
#   cloudfront:CreatePublicKey
#   cloudformation:DescribeStacks, cloudformation:CreateChangeSet,
#   cloudformation:ExecuteChangeSet, cloudformation:DescribeChangeSet
#   (key group and distribution updates run via CloudFormation)
#
# See docs/preview-access-control.md for full documentation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# --- Defaults (can be overridden by env vars or flags) ---
STACK_NAME="${PR_PREVIEW_STACK_NAME:-}"
REGION="${PR_PREVIEW_AWS_REGION:-us-east-1}"
DOMAIN="${PR_PREVIEW_DOMAIN:-}"
GITHUB_REPO=""
ENABLE_PREVIEW=true
ENABLE_STAGING=false
EXISTING_PRIVATE_KEY=""
DRY_RUN=false

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Options:
  --stack-name NAME        CloudFormation stack name (env: PR_PREVIEW_STACK_NAME)
  --region REGION          AWS region (env: PR_PREVIEW_AWS_REGION, default: us-east-1)
  --domain DOMAIN          Root domain (env: PR_PREVIEW_DOMAIN)
  --github-repo OWNER/REPO GitHub repo (auto-detected from git remote if omitted)
  --enable-preview         Enable signed cookies on PR preview distribution (default: true)
  --no-preview             Skip signed cookies on PR preview distribution
  --enable-staging         Enable signed cookies on staging distribution (default: false)
  --no-staging             Skip signed cookies on staging distribution
  --private-key FILE       Use an existing PEM private key (skip key generation)
  --dry-run                Print what would be done without making changes
  --help                   Show this message
USAGE
}

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack-name)    STACK_NAME="$2";           shift 2 ;;
    --region)        REGION="$2";               shift 2 ;;
    --domain)        DOMAIN="$2";               shift 2 ;;
    --github-repo)   GITHUB_REPO="$2";          shift 2 ;;
    --enable-preview) ENABLE_PREVIEW=true;      shift ;;
    --no-preview)    ENABLE_PREVIEW=false;      shift ;;
    --enable-staging) ENABLE_STAGING=true;      shift ;;
    --no-staging)    ENABLE_STAGING=false;      shift ;;
    --private-key)   EXISTING_PRIVATE_KEY="$2"; shift 2 ;;
    --dry-run)       DRY_RUN=true;              shift ;;
    --help|-h)       usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

# --- Validate required inputs ---
if [[ -z "${STACK_NAME}" ]]; then
  echo "Error: --stack-name or PR_PREVIEW_STACK_NAME is required" >&2
  exit 1
fi
if [[ -z "${DOMAIN}" ]]; then
  echo "Error: --domain or PR_PREVIEW_DOMAIN is required" >&2
  exit 1
fi
if [[ "${ENABLE_PREVIEW}" == "false" && "${ENABLE_STAGING}" == "false" ]]; then
  echo "Error: at least one of --enable-preview or --enable-staging must be set" >&2
  exit 1
fi

# Auto-detect GitHub repo from git remote
if [[ -z "${GITHUB_REPO}" ]]; then
  REMOTE_URL=$(git -C "${REPO_ROOT}" remote get-url origin 2>/dev/null || true)
  if [[ "${REMOTE_URL}" =~ github\.com[:/]([^/]+/[^/]+?)(\.git)?$ ]]; then
    GITHUB_REPO="${BASH_REMATCH[1]}"
  fi
fi
if [[ -z "${GITHUB_REPO}" ]]; then
  echo "Error: --github-repo required (could not auto-detect from git remote)" >&2
  exit 1
fi

log()  { echo "[setup-signed-cookies] $*"; }
warn() { echo "[setup-signed-cookies] WARN: $*" >&2; }

[[ "${DRY_RUN}" == "true" ]] && log "DRY RUN — no changes will be made"

# Validate required tools
for cmd in aws openssl jq; do
  if ! command -v "${cmd}" &>/dev/null; then
    echo "Error: ${cmd} is required but not found in PATH" >&2
    exit 1
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Generate RSA-2048 key pair (or use existing)
# ─────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY_FILE=""
PUBLIC_KEY_FILE=""

cleanup() {
  [[ -n "${PRIVATE_KEY_FILE:-}" ]] && rm -f "${PRIVATE_KEY_FILE}"
  [[ -n "${PUBLIC_KEY_FILE:-}" ]]  && rm -f "${PUBLIC_KEY_FILE}"
}
trap cleanup EXIT

if [[ -n "${EXISTING_PRIVATE_KEY}" ]]; then
  log "Step 1: Using existing private key: ${EXISTING_PRIVATE_KEY}"
  PRIVATE_KEY_FILE="${EXISTING_PRIVATE_KEY}"
  PUBLIC_KEY_FILE="$(mktemp)"
  openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -out "${PUBLIC_KEY_FILE}" 2>/dev/null
  # Don't delete the private key the user provided
  trap 'rm -f "${PUBLIC_KEY_FILE}"' EXIT
else
  log "Step 1: Generating RSA-2048 key pair..."
  PRIVATE_KEY_FILE="$(mktemp)"
  PUBLIC_KEY_FILE="$(mktemp)"
  chmod 600 "${PRIVATE_KEY_FILE}"
  if [[ "${DRY_RUN}" != "true" ]]; then
    openssl genrsa -out "${PRIVATE_KEY_FILE}" 2048 2>/dev/null
    openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -out "${PUBLIC_KEY_FILE}" 2>/dev/null
    log "RSA-2048 key pair generated."
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Upload public key to CloudFront
# ─────────────────────────────────────────────────────────────────────────────
log "Step 2: Uploading public key to CloudFront..."
KEY_NAME="${STACK_NAME}-preview-signing-key"

if [[ "${DRY_RUN}" == "true" ]]; then
  PUBLIC_KEY_ID="DRY_RUN_KEY_ID"
  log "DRY RUN: would create CloudFront public key '${KEY_NAME}'"
else
  # jq -Rs encodes the PEM as a JSON string, preserving newlines
  ENCODED_KEY_JSON=$(jq -Rs . < "${PUBLIC_KEY_FILE}")
  KEY_CONFIG=$(jq -n \
    --arg ref   "beakerstack-preview-$(date +%s)" \
    --arg name  "${KEY_NAME}" \
    --argjson   ek "${ENCODED_KEY_JSON}" \
    --arg comment "BeakerStack preview/staging signed-cookie signing key" \
    '{CallerReference: $ref, Name: $name, EncodedKey: $ek, Comment: $comment}')

  CREATE_KEY_RESPONSE=$(aws cloudfront create-public-key \
    --region "${REGION}" \
    --public-key-config "${KEY_CONFIG}" \
    --output json)
  PUBLIC_KEY_ID=$(echo "${CREATE_KEY_RESPONSE}" | jq -r '.PublicKey.Id')
  log "CloudFront public key created: ${PUBLIC_KEY_ID}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Update CloudFormation stack to create key group and enable enforcement
# ─────────────────────────────────────────────────────────────────────────────
log "Step 3: Updating CloudFormation stack '${STACK_NAME}'..."

PREVIEW_ACCESS_CONTROL="public"
[[ "${ENABLE_PREVIEW}" == "true" ]] && PREVIEW_ACCESS_CONTROL="signed-cookies"

STAGING_ACCESS_CONTROL="public"
[[ "${ENABLE_STAGING}" == "true" ]] && STAGING_ACCESS_CONTROL="signed-cookies"

if [[ "${DRY_RUN}" == "true" ]]; then
  log "DRY RUN: would deploy stack with:"
  log "  PreviewAccessControl=${PREVIEW_ACCESS_CONTROL}"
  log "  StagingAccessControl=${STAGING_ACCESS_CONTROL}"
  log "  CloudFrontSigningPublicKeyId=${PUBLIC_KEY_ID}"
else
  # --no-fail-on-empty-changeset: safe to re-run if nothing changed
  # Unspecified parameters keep their current stack values (aws cloudformation deploy behavior)
  aws cloudformation deploy \
    --template-file "${REPO_ROOT}/infra/aws/pr-preview-stack.yml" \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      "CloudFrontSigningPublicKeyId=${PUBLIC_KEY_ID}" \
      "PreviewAccessControl=${PREVIEW_ACCESS_CONTROL}" \
      "StagingAccessControl=${STAGING_ACCESS_CONTROL}"

  log "Stack update complete. CloudFront distribution changes propagate in ~5-10 min."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Write secrets to GitHub Actions
# ─────────────────────────────────────────────────────────────────────────────
log "Step 4: Writing secrets to GitHub (${GITHUB_REPO})..."

if [[ "${DRY_RUN}" == "true" ]]; then
  log "DRY RUN: would set CLOUDFRONT_SIGNING_KEY and CLOUDFRONT_SIGNING_KEY_ID on ${GITHUB_REPO}"
else
  if ! command -v gh &>/dev/null; then
    warn "gh CLI not found — set GitHub secrets manually:"
    warn "  CLOUDFRONT_SIGNING_KEY    = contents of ${PRIVATE_KEY_FILE}"
    warn "  CLOUDFRONT_SIGNING_KEY_ID = ${PUBLIC_KEY_ID}"
    warn "  (delete the key file after copying: ${PRIVATE_KEY_FILE})"
    # Prevent cleanup of private key file so user can retrieve it
    PRIVATE_KEY_FILE=""
  else
    cat "${PRIVATE_KEY_FILE}" | gh secret set CLOUDFRONT_SIGNING_KEY \
      --repo "${GITHUB_REPO}"
    gh secret set CLOUDFRONT_SIGNING_KEY_ID \
      --body "${PUBLIC_KEY_ID}" \
      --repo "${GITHUB_REPO}"
    log "GitHub secrets written: CLOUDFRONT_SIGNING_KEY, CLOUDFRONT_SIGNING_KEY_ID"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
cat <<SUMMARY

=============================================================
  Signed-cookie access control setup complete
=============================================================
  CloudFront public key ID : ${PUBLIC_KEY_ID}
  Stack                    : ${STACK_NAME} (${REGION})
  PR preview access        : ${PREVIEW_ACCESS_CONTROL}
  Staging access           : ${STAGING_ACCESS_CONTROL}

  GitHub secrets set:
    CLOUDFRONT_SIGNING_KEY      (RSA private key PEM)
    CLOUDFRONT_SIGNING_KEY_ID   (${PUBLIC_KEY_ID})

  Next steps:
  - CloudFront distribution updates propagate in ~5-10 min.
  - On the next PR preview deploy, CI signs the cookie and posts
    the bootstrap URL to the PR and GitHub Deployments.
  - On the next staging deploy, CI posts the staging bootstrap URL
    to GitHub Deployments and the Actions run summary.

  See docs/preview-access-control.md for full documentation.
=============================================================
SUMMARY
