#!/usr/bin/env bash
# Resolve PR push refs for incremental CI scoping (Test + PR Preview).
#
# On synchronize, diffs event.before..head when the before commit is still
# reachable. After a force-push rebase, event.before may be a rewritten SHA
# that no longer exists — fall back to origin/<base>..head (full PR diff).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLASSIFIER="${SCRIPT_DIR}/classify-pr-push-changes.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") <action> <before_sha> <head_sha> <base_ref>

Example:
  $(basename "$0") synchronize abc123 def456 develop
EOF
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  if [[ $# -lt 4 ]]; then
    usage >&2
    exit 2
  fi

  local action="$1"
  local before_sha="$2"
  local head_sha="$3"
  local base_ref="$4"
  local base_git_ref="origin/${base_ref}"

  if [[ "${action}" == "synchronize" \
    && -n "${before_sha}" \
    && "${before_sha}" != "0000000000000000000000000000000000000000" ]] \
    && git cat-file -e "${before_sha}^{commit}" 2>/dev/null; then
    local incremental_diff
    incremental_diff="$(git diff --name-only "${before_sha}" "${head_sha}")"
    if grep -qxE 'scripts/ci/classify-pr-(push-changes|event)\.sh' <<<"${incremental_diff}"; then
      printf '[INFO] classifier script changed; classifying full PR %s..%s\n' \
        "${base_git_ref}" "${head_sha}" >&2
      exec "${CLASSIFIER}" "${base_git_ref}" "${head_sha}"
    fi
    exec "${CLASSIFIER}" "${before_sha}" "${head_sha}"
  fi

  if [[ "${action}" == "synchronize" && -n "${before_sha}" \
    && "${before_sha}" != "0000000000000000000000000000000000000000" ]]; then
    printf '[WARN] event.before %s is not reachable (force-push?); classifying %s..%s\n' \
      "${before_sha}" "${base_git_ref}" "${head_sha}" >&2
  fi

  exec "${CLASSIFIER}" "${base_git_ref}" "${head_sha}"
}

main "$@"
