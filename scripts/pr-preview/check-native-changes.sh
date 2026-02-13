#!/usr/bin/env bash

set -euo pipefail

# Script to detect if native code changes require a rebuild
# Returns 0 (true) if rebuild needed, 1 (false) if not needed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BASE_REF="${1:-origin/main}"
HEAD_REF="${2:-HEAD}"
PR_NUMBER="${PR_NUMBER:-}"

log() {
  local level="$1"
  shift
  printf '[%-5s] %s\n' "${level}" "$*" >&2
}

# Files and directories that indicate native code changes
NATIVE_PATTERNS=(
  "apps/mobile/package.json"
  "apps/mobile/app.config.ts"
  "apps/mobile/eas.json"
  "apps/mobile/patches/"
  "apps/mobile/android/"
  "apps/mobile/ios/"
  "package.json"
  "package-lock.json"
)

# Check if any native-related files changed
check_native_file_changes() {
  local base_ref="$1"
  local head_ref="$2"
  
  log "INFO" "Checking for native code changes between ${base_ref} and ${head_ref}..."
  
  for pattern in "${NATIVE_PATTERNS[@]}"; do
    if git diff --name-only "${base_ref}" "${head_ref}" | grep -q "^${pattern}" || \
       git diff --name-only "${base_ref}" "${head_ref}" | grep -q "^${pattern%/}"; then
      log "INFO" "Native change detected in: ${pattern}"
      return 0
    fi
  done
  
  log "INFO" "No native code changes detected"
  return 1
}

# Check if a build already exists for this PR
# This is an optimization to avoid rebuilding on every commit
check_existing_build() {
  local pr_number="$1"
  
  if [[ -z "${pr_number}" ]]; then
    # Can't check without PR number
    return 1
  fi
  
  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    # Can't query EAS without token
    log "WARN" "EXPO_TOKEN not set, cannot check for existing builds"
    return 1
  fi
  
  log "INFO" "Checking for existing builds for PR #${pr_number}..."
  
  # Query EAS for builds with PR number in message
  # Build messages typically include "PR #<number>"
  local build_list
  build_list="$(cd "${REPO_ROOT}/apps/mobile" && \
    EXPO_TOKEN="${EXPO_TOKEN}" npx --yes eas-cli build:list \
    --platform all \
    --limit 50 \
    --non-interactive \
    --json 2>/dev/null || echo "[]")"
  
  if [[ -z "${build_list}" || "${build_list}" == "[]" ]]; then
    log "INFO" "No existing builds found"
    return 1
  fi
  
  # Check if any build message contains "PR #${pr_number}"
  if echo "${build_list}" | jq -e --arg pr "PR #${pr_number}" \
    '[.[] | select(.message // "" | contains($pr))] | length > 0' >/dev/null 2>&1; then
    log "INFO" "Found existing build(s) for PR #${pr_number}"
    return 0
  fi
  
  log "INFO" "No existing builds found for PR #${pr_number}"
  return 1
}

main() {
  # Always check for native file changes first
  if check_native_file_changes "${BASE_REF}" "${HEAD_REF}"; then
    log "INFO" "Native code changes detected - rebuild needed"
    echo "true"
    exit 0
  fi
  
  # If no native file changes, check if a build already exists
  # If a build exists, we don't need to rebuild (optimization)
  if [[ -n "${PR_NUMBER}" ]] && check_existing_build "${PR_NUMBER}"; then
    log "INFO" "Existing build found for PR #${PR_NUMBER} and no native changes - rebuild not needed"
    echo "false"
    exit 1
  fi
  
  # No native changes and no existing build
  # For first commit to a PR, we might still want to build if it's a new PR
  # But to be conservative, we only build when native files change
  log "INFO" "No native changes detected - rebuild not needed"
  echo "false"
  exit 1
}

main "$@"

