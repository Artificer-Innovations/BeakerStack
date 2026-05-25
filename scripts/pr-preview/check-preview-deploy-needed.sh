#!/usr/bin/env bash
# Decide whether PR preview (web + mobile + Supabase reset path in CI) should run.
#
# Delegates path classification to scripts/ci/classify-pr-push-changes.sh.
# Keep preview allowlist changes in that script (single source of truth).
#
# Keep the path allowlist conceptually aligned with .github/workflows/test.yml
# (pull_request paths) plus preview-only paths (scripts/pr-preview/**,
# infra/aws/** for CloudFormation / CloudFront preview routing, pr-preview
# workflow file). If a change cannot affect built previews or this workflow's
# deploy scripts, we skip the heavy deploy job to save Expo/AWS/CI.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CLASSIFIER="${REPO_ROOT}/scripts/ci/classify-pr-push-changes.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") <base_ref> <head_ref>
       $(basename "$0") --self-test

Compare git refs (e.g. origin/develop HEAD). Writes run_deploy=true|false to
GITHUB_OUTPUT when set. Exits 0 always unless --self-test fails or git errors.
EOF
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  if [[ "${1:-}" == "--self-test" ]]; then
    "${CLASSIFIER}" --self-test
    exit $?
  fi

  if [[ $# -lt 2 ]]; then
    usage >&2
    exit 2
  fi

  cd "${REPO_ROOT}"
  "${CLASSIFIER}" "$1" "$2"

  # classify-pr-push-changes.sh already writes run_deploy to GITHUB_OUTPUT
}

main "$@"
