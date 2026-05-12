#!/usr/bin/env bash
# Decide whether PR preview (web + mobile + Supabase reset path in CI) should run.
#
# Keep the path allowlist conceptually aligned with .github/workflows/test.yml
# (pull_request paths) plus preview-only paths (scripts/pr-preview/**,
# infra/aws/** for CloudFormation / CloudFront preview routing, pr-preview
# workflow file). If a change cannot affect built previews or this workflow's
# deploy scripts, we skip the heavy deploy job to save Expo/AWS/CI.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") <base_ref> <head_ref>
       $(basename "$0") --self-test

Compare git refs (e.g. origin/develop HEAD). Writes run_deploy=true|false to
GITHUB_OUTPUT when set. Exits 0 always unless --self-test fails or git errors.
EOF
}

# Returns 0 if this path can affect PR preview artifacts or pr-preview tooling.
preview_path_matches() {
  local f="$1"

  case "$f" in
    apps/* | packages/* | supabase/*) return 0 ;;
    infra/aws/*) return 0 ;;
    package.json | package-lock.json) return 0 ;;
    .github/workflows/pr-preview-environment.yml) return 0 ;;
    scripts/pr-preview/*) return 0 ;;
  esac

  # Root-only configs that can affect workspace builds (mirrors test.yml intent).
  if [[ "$f" != */* ]]; then
    case "$f" in
      tsconfig.json | tsconfig.*.json) return 0 ;;
      babel.config.* | metro.config.* | jest.config.* | vite.config.*) return 0 ;;
      *.config.js | *.config.ts) return 0 ;;
    esac
  fi

  return 1
}

compute_run_deploy() {
  local base_ref="$1"
  local head_ref="$2"
  local file
  local any=false

  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    if preview_path_matches "${file}"; then
      any=true
      break
    fi
  done < <(git diff --name-only "${base_ref}" "${head_ref}")

  if [[ "${any}" == true ]]; then
    echo "true"
  else
    echo "false"
  fi
}

self_test() {
  local failed=0
  check_one() {
    local path="$1"
    local want_match="$2" # 1 = should match, 0 = should not
    if preview_path_matches "${path}"; then
      if [[ "${want_match}" != 1 ]]; then
        printf 'self-test FAIL: %s should NOT match preview allowlist\n' "${path}" >&2
        failed=1
      fi
    else
      if [[ "${want_match}" != 0 ]]; then
        printf 'self-test FAIL: %s should match preview allowlist\n' "${path}" >&2
        failed=1
      fi
    fi
  }

  check_one README.md 0
  check_one docs/guide.md 0
  check_one scripts/setup-full.mjs 0
  check_one scripts/lib/setup-manifest.mjs 0
  check_one .github/workflows/test.yml 0
  check_one apps/web/src/App.tsx 1
  check_one packages/shared/src/index.ts 1
  check_one supabase/migrations/foo.sql 1
  check_one package.json 1
  check_one package-lock.json 1
  check_one scripts/pr-preview/deploy-web.sh 1
  check_one infra/aws/functions/PRPathRouter.js 1
  check_one infra/aws/pr-preview-stack.yml 1
  check_one .github/workflows/pr-preview-environment.yml 1
  check_one tsconfig.json 1
  check_one apps/web/vite.config.ts 1

  return "${failed}"
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  if [[ "${1:-}" == "--self-test" ]]; then
    self_test
    exit $?
  fi

  if [[ $# -lt 2 ]]; then
    usage >&2
    exit 2
  fi

  local base_ref="$1"
  local head_ref="$2"

  cd "${REPO_ROOT}"

  local run_deploy
  run_deploy="$(compute_run_deploy "${base_ref}" "${head_ref}")"

  printf '[INFO] PR preview deploy needed (run_deploy=%s) for %s...%s\n' "${run_deploy}" "${base_ref}" "${head_ref}" >&2

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf 'run_deploy=%s\n' "${run_deploy}" >>"${GITHUB_OUTPUT}"
  else
    printf '%s\n' "${run_deploy}"
  fi
}

main "$@"
