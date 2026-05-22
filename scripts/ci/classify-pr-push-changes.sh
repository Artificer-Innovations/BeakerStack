#!/usr/bin/env bash
# Classify changed files in a git ref range for CI job scoping (Test + PR Preview).
#
# Used by .github/workflows/test.yml (test-scope) and pr-preview-environment.yml
# (preview-scope). Keep --self-test cases updated when adding path rules.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") <base_ref> <head_ref>
       $(basename "$0") --self-test

Compare git refs and write boolean flags to GITHUB_OUTPUT (when set) or stdout.

Flags:
  app_code              apps/**, packages/**, tests/**, lint/tsconfig deps
  supabase_schema       supabase migrations, functions, config (excludes templates)
  email_templates       supabase/templates/** and email personalization scripts
  auth_deploy_scripts   scripts/sync-supabase-auth-config.sh
  billing_deploy        stripe webhook / billing deploy scripts
  web_deploy            apps/web/** and runtime packages/**/src (excluding tests)
  mobile_deploy         apps/mobile/** and mobile runtime packages/**/src (excluding tests)
  deploy_infra          infra/aws/**, scripts/pr-preview/**, deploy workflows
  tested_scripts        scripts covered by test:unit:scripts
  dependencies          package.json / package-lock.json changes

Derived (Test workflow):
  run_lint, run_typecheck, run_unit, run_supabase, run_email_templates,
  run_migration_filenames, run_tested_scripts

Derived (PR Preview):
  run_deploy            any preview-relevant change in this range
  run_infra, run_supabase_reset, run_stripe_billing, run_auth_sync,
  run_web, run_mobile
EOF
}

bool() {
  if [[ "$1" == true ]]; then
    echo "true"
  else
    echo "false"
  fi
}

write_flag() {
  local key="$1"
  local value="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "${key}" "${value}" >>"${GITHUB_OUTPUT}"
  else
    printf '%s=%s\n' "${key}" "${value}"
  fi
}

# True for test-only paths under packages/ (should not trigger preview app builds).
is_package_test_path() {
  local f="$1"
  case "$f" in
    packages/shared-tests/* | packages/test-utils/*)
      return 0
      ;;
  esac
  if [[ "${f}" == *"/__tests__/"* ]]; then
    case "${f}" in
      packages/*) return 0 ;;
    esac
  fi
  case "${f}" in
    *.test.ts | *.test.tsx | *.test.mjs | *.test.js | *.coverage.test.ts | *.coverage.test.tsx)
      case "${f}" in
        packages/*) return 0 ;;
      esac
      ;;
  esac
  return 1
}

# True for runtime library source under packages/*/src consumed by preview app builds.
is_package_runtime_source() {
  local f="$1"
  is_package_test_path "${f}" && return 1
  case "${f}" in
    packages/shared/src/* | packages/billing/src/* | packages/logger/src/* | \
    packages/observability/src/* | packages/admin/src/* | packages/email/src/* | \
    packages/waitlist/src/* | packages/lifecycle-events/src/*)
      return 0
      ;;
  esac
  return 1
}

# Runtime packages consumed by apps/web but not bundled into apps/mobile.
is_package_web_only_runtime_source() {
  local f="$1"
  case "${f}" in
    packages/admin/src/* | packages/email/src/* | packages/waitlist/src/* | \
    packages/lifecycle-events/src/*)
      return 0
      ;;
  esac
  return 1
}

# Classify one path; sets global match_* booleans (multiple may be true).
classify_path() {
  local f="$1"

  match_app_code=false
  match_supabase_schema=false
  match_email_templates=false
  match_auth_deploy=false
  match_billing_deploy=false
  match_web_deploy=false
  match_mobile_deploy=false
  match_deploy_infra=false
  match_tested_scripts=false
  match_dependencies=false

  case "$f" in
    apps/web/*)
      match_app_code=true
      match_web_deploy=true
      ;;
    apps/mobile/*)
      match_app_code=true
      match_mobile_deploy=true
      ;;
    apps/* | tests/*)
      match_app_code=true
      ;;
    packages/*)
      match_app_code=true
      if is_package_runtime_source "${f}"; then
        match_web_deploy=true
        if ! is_package_web_only_runtime_source "${f}"; then
          match_mobile_deploy=true
        fi
      fi
      ;;
    supabase/migrations/* | supabase/functions/* | supabase/config.toml | supabase/seed.sql | supabase/seed/*)
      match_supabase_schema=true
      ;;
    supabase/templates/*)
      match_email_templates=true
      ;;
    supabase/*)
      match_supabase_schema=true
      ;;
    infra/aws/*)
      match_deploy_infra=true
      ;;
    scripts/pr-preview/*)
      match_deploy_infra=true
      ;;
    .github/workflows/pr-preview-environment.yml | .github/workflows/deploy-staging.yml | .github/workflows/deploy-production.yml)
      match_deploy_infra=true
      ;;
    scripts/sync-supabase-auth-config.sh)
      match_auth_deploy=true
      ;;
    scripts/personalize-email-templates.mjs | scripts/materialize-email-config.mjs)
      match_email_templates=true
      ;;
    scripts/lib/email-config-subjects.mjs)
      match_email_templates=true
      match_tested_scripts=true
      ;;
    scripts/ensure-stripe-webhook-endpoint.mjs | scripts/ensure-kit-sync-cron.mjs | scripts/billing/*)
      match_billing_deploy=true
      ;;
    scripts/lib/* | scripts/__tests__/*)
      match_tested_scripts=true
      ;;
    scripts/rename-project.mjs | scripts/detect-repo-identity.mjs | scripts/setup-aws-discover.mjs | scripts/setup-dotenv.mjs | scripts/setup-manifest-github-sync.mjs | scripts/setup-secret-input.mjs | scripts/setup-supabase-pick-recommend.mjs | scripts/billing-webhook-guards.mjs | scripts/setup-stripe.mjs | scripts/merge-coverage.mjs | scripts/format-supabase-test-summary.mjs | scripts/setup-route53-email-records.mjs | scripts/setup-resend-api.mjs | scripts/setup-resend-keys.mjs | scripts/setup-google-oauth.mjs)
      match_tested_scripts=true
      ;;
    package.json | package-lock.json | */package.json)
      match_dependencies=true
      match_app_code=true
      ;;
    .eslintrc.js | .github/workflows/test.yml | .github/actions/*)
      match_app_code=true
      ;;
    .github/workflows/*)
      # Other workflows — do not trigger app tests or preview deploy by default
      ;;
    docs/* | README.md | LICENSE | *.md)
      ;;
    scripts/ci/* | scripts/ci-* | scripts/format-ci-summary.mjs | scripts/check-csp-hash.mjs)
      match_tested_scripts=true
      ;;
    scripts/*)
      # Unknown scripts: conservative — do not treat as app_code (avoids full Test on deploy-only fixes)
      ;;
  esac

  # Root-only build configs (mirrors test.yml)
  if [[ "$f" != */* ]]; then
    case "$f" in
      tsconfig.json | tsconfig.*.json | babel.config.* | metro.config.* | jest.config.* | vite.config.* | *.config.js | *.config.ts)
        match_app_code=true
        ;;
    esac
  fi

  # Per-app/per-package configs anywhere in tree
  case "$f" in
    */tsconfig.json | */tsconfig.*.json | */jest.config.* | */babel.config.* | */metro.config.* | */vite.config.* | */*.config.js | */*.config.ts)
      match_app_code=true
      ;;
  esac
}

classify_range() {
  local base_ref="$1"
  local head_ref="$2"

  local app_code=false
  local supabase_schema=false
  local email_templates=false
  local auth_deploy=false
  local billing_deploy=false
  local web_deploy=false
  local mobile_deploy=false
  local deploy_infra=false
  local tested_scripts=false
  local dependencies=false

  local file diff_files
  if ! diff_files="$(git diff --name-only "${base_ref}" "${head_ref}")"; then
    printf '[ERROR] git diff failed for %s..%s\n' "${base_ref}" "${head_ref}" >&2
    exit 1
  fi
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    classify_path "${file}"
    [[ "${match_app_code}" == true ]] && app_code=true
    [[ "${match_supabase_schema}" == true ]] && supabase_schema=true
    [[ "${match_email_templates}" == true ]] && email_templates=true
    [[ "${match_auth_deploy}" == true ]] && auth_deploy=true
    [[ "${match_billing_deploy}" == true ]] && billing_deploy=true
    [[ "${match_web_deploy}" == true ]] && web_deploy=true
    [[ "${match_mobile_deploy}" == true ]] && mobile_deploy=true
    [[ "${match_deploy_infra}" == true ]] && deploy_infra=true
    [[ "${match_tested_scripts}" == true ]] && tested_scripts=true
    [[ "${match_dependencies}" == true ]] && dependencies=true
  done <<<"${diff_files}"

  # Lockfile-only changes need web + mobile preview deploys (not just run_deploy=true).
  if [[ "${dependencies}" == true ]]; then
    web_deploy=true
    mobile_deploy=true
  fi

  # Derived Test flags
  local run_lint="${app_code}"
  local run_typecheck="${app_code}"
  local run_unit="${app_code}"
  local run_supabase="${supabase_schema}"
  local run_email_templates="${email_templates}"
  local run_migration_filenames="${supabase_schema}"
  local run_tested_scripts="${tested_scripts}"

  # Derived Preview flags
  local run_supabase_reset="${supabase_schema}"
  local run_stripe_billing="${billing_deploy}"
  local run_auth_sync=false
  if [[ "${auth_deploy}" == true || "${email_templates}" == true ]]; then
    run_auth_sync=true
  fi
  local run_web="${web_deploy}"
  local run_mobile="${mobile_deploy}"
  local run_infra="${deploy_infra}"

  local run_deploy=false
  if [[ "${deploy_infra}" == true || "${web_deploy}" == true || "${mobile_deploy}" == true || \
        "${supabase_schema}" == true || "${billing_deploy}" == true || "${auth_deploy}" == true || \
        "${email_templates}" == true || "${dependencies}" == true ]]; then
    run_deploy=true
  fi

  write_flag app_code "$(bool "${app_code}")"
  write_flag supabase_schema "$(bool "${supabase_schema}")"
  write_flag email_templates "$(bool "${email_templates}")"
  write_flag auth_deploy_scripts "$(bool "${auth_deploy}")"
  write_flag billing_deploy "$(bool "${billing_deploy}")"
  write_flag web_deploy "$(bool "${web_deploy}")"
  write_flag mobile_deploy "$(bool "${mobile_deploy}")"
  write_flag deploy_infra "$(bool "${deploy_infra}")"
  write_flag tested_scripts "$(bool "${tested_scripts}")"
  write_flag dependencies "$(bool "${dependencies}")"
  write_flag run_lint "$(bool "${run_lint}")"
  write_flag run_typecheck "$(bool "${run_typecheck}")"
  write_flag run_unit "$(bool "${run_unit}")"
  write_flag run_supabase "$(bool "${run_supabase}")"
  write_flag run_email_templates "$(bool "${run_email_templates}")"
  write_flag run_migration_filenames "$(bool "${run_migration_filenames}")"
  write_flag run_tested_scripts "$(bool "${run_tested_scripts}")"
  write_flag run_deploy "$(bool "${run_deploy}")"
  write_flag run_infra "$(bool "${run_infra}")"
  write_flag run_supabase_reset "$(bool "${run_supabase_reset}")"
  write_flag run_stripe_billing "$(bool "${run_stripe_billing}")"
  write_flag run_auth_sync "$(bool "${run_auth_sync}")"
  write_flag run_web "$(bool "${run_web}")"
  write_flag run_mobile "$(bool "${run_mobile}")"

  printf '[INFO] classify %s..%s: run_deploy=%s app_code=%s web=%s mobile=%s auth_sync=%s\n' \
    "${base_ref}" "${head_ref}" "$(bool "${run_deploy}")" "$(bool "${app_code}")" \
    "$(bool "${run_web}")" "$(bool "${run_mobile}")" "$(bool "${run_auth_sync}")" >&2
}

self_test() {
  local failed=0

  assert_classify() {
    local path="$1"
    local field="$2"
    local want="$3" # true|false
    classify_path "${path}"
    local got=false
    case "${field}" in
      app_code) [[ "${match_app_code}" == true ]] && got=true ;;
      supabase_schema) [[ "${match_supabase_schema}" == true ]] && got=true ;;
      email_templates) [[ "${match_email_templates}" == true ]] && got=true ;;
      auth_deploy) [[ "${match_auth_deploy}" == true ]] && got=true ;;
      billing_deploy) [[ "${match_billing_deploy}" == true ]] && got=true ;;
      web_deploy) [[ "${match_web_deploy}" == true ]] && got=true ;;
      mobile_deploy) [[ "${match_mobile_deploy}" == true ]] && got=true ;;
      deploy_infra) [[ "${match_deploy_infra}" == true ]] && got=true ;;
      tested_scripts) [[ "${match_tested_scripts}" == true ]] && got=true ;;
      dependencies) [[ "${match_dependencies}" == true ]] && got=true ;;
      *) printf 'self-test FAIL: unknown field %s\n' "${field}" >&2; failed=1; return ;;
    esac
    if [[ "${got}" != "${want}" ]]; then
      printf 'self-test FAIL: %s field %s expected %s got %s\n' "${path}" "${field}" "${want}" "${got}" >&2
      failed=1
    fi
  }

  assert_classify README.md app_code false
  assert_classify docs/guide.md app_code false
  assert_classify scripts/sync-supabase-auth-config.sh auth_deploy true
  assert_classify scripts/sync-supabase-auth-config.sh app_code false
  assert_classify scripts/materialize-email-config.mjs email_templates true
  assert_classify scripts/materialize-email-config.mjs app_code false
  assert_classify scripts/setup-full.mjs app_code false
  assert_classify scripts/lib/email-config-subjects.mjs tested_scripts true
  assert_classify scripts/lib/email-config-subjects.mjs app_code false
  assert_classify apps/web/src/App.tsx web_deploy true
  assert_classify apps/mobile/app/index.tsx mobile_deploy true
  assert_classify supabase/migrations/001.sql supabase_schema true
  assert_classify supabase/templates/generated/foo.html email_templates true
  assert_classify supabase/templates/generated/foo.html supabase_schema false
  assert_classify scripts/ci/classify-pr-push-changes.sh tested_scripts true
  assert_classify scripts/pr-preview/deploy-web.sh deploy_infra true
  assert_classify infra/aws/pr-preview-stack.yml deploy_infra true
  assert_classify package.json dependencies true
  assert_classify package.json app_code true
  assert_classify .github/workflows/test.yml app_code true
  assert_classify .github/workflows/pr-preview-environment.yml deploy_infra true
  assert_classify packages/shared/src/hooks/useAuth.ts web_deploy true
  assert_classify packages/shared/src/hooks/useAuth.ts mobile_deploy true
  assert_classify packages/shared/src/hooks/useAuth.ts app_code true
  assert_classify packages/billing/src/hooks/useCheckout.ts web_deploy true
  assert_classify packages/billing/src/hooks/useCheckout.ts mobile_deploy true
  assert_classify packages/billing/src/presentation/billingSyncDisplay.ts web_deploy true
  assert_classify packages/billing/src/presentation/billingSyncDisplay.ts mobile_deploy true
  assert_classify packages/billing/src/hooks/useCheckout.test.ts web_deploy false
  assert_classify packages/billing/src/hooks/useCheckout.test.ts mobile_deploy false
  assert_classify packages/billing/src/hooks/useCheckout.test.ts app_code true
  assert_classify packages/shared-tests/__tests__/AppHeader.native.test.tsx web_deploy false
  assert_classify packages/shared-tests/__tests__/AppHeader.native.test.tsx mobile_deploy false
  assert_classify packages/shared-tests/__tests__/AppHeader.native.test.tsx app_code true
  assert_classify packages/admin/src/adminClient.ts web_deploy true
  assert_classify packages/admin/src/adminClient.ts mobile_deploy false
  assert_classify packages/lifecycle-events/src/index.ts web_deploy true
  assert_classify packages/lifecycle-events/src/index.ts mobile_deploy false

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

  cd "${REPO_ROOT}"
  classify_range "$1" "$2"
}

main "$@"
