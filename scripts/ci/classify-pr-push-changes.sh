#!/usr/bin/env bash
# Classify changed files in a git ref range for CI job scoping (Test + PR Preview).
#
# Used by .github/workflows/test.yml (test-scope) and pr-preview-environment.yml
# (preview-scope). Keep --self-test cases updated when adding path rules or
# derived flags (run_supabase, run_supabase_reset, etc.).

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
  supabase_schema       supabase migrations, functions, config; adopter/db/**; adopter db scripts
  integration_tests     tests/integration/**, tests/utils/**, integration Jest configs
  email_templates       supabase/templates/** and email personalization scripts
  auth_deploy_scripts   scripts/sync-supabase-auth-config.sh
  billing_deploy        stripe webhook / billing deploy scripts
  web_deploy            apps/web/**, adopter/web/**, adopter/config/**, adopter/assets/**, runtime packages/**/src (excluding tests)
  mobile_deploy         apps/mobile/**, adopter/mobile/**, adopter/config/**, adopter/assets/**, mobile runtime packages/**/src (excluding tests)
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
    packages/waitlist/src/* | packages/lifecycle-events/src/* | packages/help/src/* | \
    packages/articles/src/*)
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
    packages/lifecycle-events/src/* | packages/help/src/* | packages/articles/src/*)
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
  match_integration_tests=false
  match_email_templates=false
  match_auth_deploy=false
  match_billing_deploy=false
  match_web_deploy=false
  match_mobile_deploy=false
  match_deploy_infra=false
  match_tested_scripts=false
  match_dependencies=false

  case "$f" in
    adopter/mobile/*)
      match_app_code=true
      match_mobile_deploy=true
      ;;
    adopter/web/*)
      match_app_code=true
      match_web_deploy=true
      ;;
    adopter/config/* | adopter/assets/*)
      match_app_code=true
      match_web_deploy=true
      match_mobile_deploy=true
      ;;
    adopter/content/help.md)
      match_app_code=true
      match_web_deploy=true
      ;;
    adopter/content/articles/*)
      match_app_code=true
      match_web_deploy=true
      ;;
    adopter/db/*)
      match_app_code=true
      match_supabase_schema=true
      ;;
    apps/web/*)
      match_app_code=true
      match_web_deploy=true
      ;;
    apps/mobile/*)
      match_app_code=true
      match_mobile_deploy=true
      ;;
    tests/integration/* | tests/utils/* | tests/jest.integration.config.js | tests/jest.integration.edge.config.js)
      match_app_code=true
      match_integration_tests=true
      ;;
    apps/* | tests/*)
      match_app_code=true
      ;;
    packages/adopter-tests/*)
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
    scripts/db-apply-adopter.mjs | scripts/db-init-adopter.mjs | scripts/lib/resolve-adopter-database-url.mjs)
      match_supabase_schema=true
      match_tested_scripts=true
      ;;
    scripts/personalize-email-templates.mjs | scripts/materialize-email-config.mjs)
      match_email_templates=true
      ;;
    scripts/lib/email-config-subjects.mjs)
      match_email_templates=true
      match_tested_scripts=true
      ;;
    scripts/ensure-stripe-webhook-endpoint.mjs | scripts/ensure-kit-webhook-endpoint.mjs | scripts/ensure-kit-sync-cron.mjs | scripts/pr-preview/deploy-preview-billing-functions.sh | scripts/billing/*)
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

# Aggregated classification for one or more paths (self-test + classify_range).
result_app_code=false
result_supabase_schema=false
result_integration_tests=false
result_email_templates=false
result_auth_deploy=false
result_billing_deploy=false
result_web_deploy=false
result_mobile_deploy=false
result_deploy_infra=false
result_tested_scripts=false
result_dependencies=false
result_run_lint=false
result_run_typecheck=false
result_run_unit=false
result_run_supabase=false
result_run_email_templates=false
result_run_migration_filenames=false
result_run_tested_scripts=false
result_run_deploy=false
result_run_infra=false
result_run_supabase_reset=false
result_run_stripe_billing=false
result_run_auth_sync=false
result_run_web=false
result_run_mobile=false

compute_derived_flags() {
  result_run_lint="${result_app_code}"
  result_run_typecheck="${result_app_code}"
  result_run_unit="${result_app_code}"
  result_run_supabase=false
  if [[ "${result_supabase_schema}" == true || "${result_integration_tests}" == true ]]; then
    result_run_supabase=true
  fi
  result_run_email_templates="${result_email_templates}"
  result_run_migration_filenames="${result_supabase_schema}"
  result_run_tested_scripts="${result_tested_scripts}"

  result_run_supabase_reset="${result_supabase_schema}"
  result_run_stripe_billing="${result_billing_deploy}"
  result_run_auth_sync=false
  if [[ "${result_auth_deploy}" == true || "${result_email_templates}" == true ]]; then
    result_run_auth_sync=true
  fi
  result_run_web="${result_web_deploy}"
  result_run_mobile="${result_mobile_deploy}"
  result_run_infra="${result_deploy_infra}"

  result_run_deploy=false
  if [[ "${result_deploy_infra}" == true || "${result_web_deploy}" == true || "${result_mobile_deploy}" == true || \
        "${result_supabase_schema}" == true || "${result_billing_deploy}" == true || "${result_auth_deploy}" == true || \
        "${result_email_templates}" == true || "${result_dependencies}" == true ]]; then
    result_run_deploy=true
  fi
}

aggregate_paths() {
  result_app_code=false
  result_supabase_schema=false
  result_integration_tests=false
  result_email_templates=false
  result_auth_deploy=false
  result_billing_deploy=false
  result_web_deploy=false
  result_mobile_deploy=false
  result_deploy_infra=false
  result_tested_scripts=false
  result_dependencies=false

  local file
  for file in "$@"; do
    [[ -z "${file}" ]] && continue
    classify_path "${file}"
    [[ "${match_app_code}" == true ]] && result_app_code=true
    [[ "${match_supabase_schema}" == true ]] && result_supabase_schema=true
    [[ "${match_integration_tests}" == true ]] && result_integration_tests=true
    [[ "${match_email_templates}" == true ]] && result_email_templates=true
    [[ "${match_auth_deploy}" == true ]] && result_auth_deploy=true
    [[ "${match_billing_deploy}" == true ]] && result_billing_deploy=true
    [[ "${match_web_deploy}" == true ]] && result_web_deploy=true
    [[ "${match_mobile_deploy}" == true ]] && result_mobile_deploy=true
    [[ "${match_deploy_infra}" == true ]] && result_deploy_infra=true
    [[ "${match_tested_scripts}" == true ]] && result_tested_scripts=true
    [[ "${match_dependencies}" == true ]] && result_dependencies=true
  done

  if [[ "${result_dependencies}" == true ]]; then
    result_web_deploy=true
    result_mobile_deploy=true
  fi

  compute_derived_flags
}

write_classification_flags() {
  write_flag app_code "$(bool "${result_app_code}")"
  write_flag supabase_schema "$(bool "${result_supabase_schema}")"
  write_flag integration_tests "$(bool "${result_integration_tests}")"
  write_flag email_templates "$(bool "${result_email_templates}")"
  write_flag auth_deploy_scripts "$(bool "${result_auth_deploy}")"
  write_flag billing_deploy "$(bool "${result_billing_deploy}")"
  write_flag web_deploy "$(bool "${result_web_deploy}")"
  write_flag mobile_deploy "$(bool "${result_mobile_deploy}")"
  write_flag deploy_infra "$(bool "${result_deploy_infra}")"
  write_flag tested_scripts "$(bool "${result_tested_scripts}")"
  write_flag dependencies "$(bool "${result_dependencies}")"
  write_flag run_lint "$(bool "${result_run_lint}")"
  write_flag run_typecheck "$(bool "${result_run_typecheck}")"
  write_flag run_unit "$(bool "${result_run_unit}")"
  write_flag run_supabase "$(bool "${result_run_supabase}")"
  write_flag run_email_templates "$(bool "${result_run_email_templates}")"
  write_flag run_migration_filenames "$(bool "${result_run_migration_filenames}")"
  write_flag run_tested_scripts "$(bool "${result_run_tested_scripts}")"
  write_flag run_deploy "$(bool "${result_run_deploy}")"
  write_flag run_infra "$(bool "${result_run_infra}")"
  write_flag run_supabase_reset "$(bool "${result_run_supabase_reset}")"
  write_flag run_stripe_billing "$(bool "${result_run_stripe_billing}")"
  write_flag run_auth_sync "$(bool "${result_run_auth_sync}")"
  write_flag run_web "$(bool "${result_run_web}")"
  write_flag run_mobile "$(bool "${result_run_mobile}")"
}

classify_range() {
  local base_ref="$1"
  local head_ref="$2"

  local diff_files
  if ! diff_files="$(git diff --name-only "${base_ref}" "${head_ref}")"; then
    printf '[ERROR] git diff failed for %s..%s\n' "${base_ref}" "${head_ref}" >&2
    exit 1
  fi

  local -a files=()
  local file
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    files+=("${file}")
  done <<<"${diff_files}"

  aggregate_paths "${files[@]}"
  write_classification_flags

  printf '[INFO] classify %s..%s: run_deploy=%s app_code=%s web=%s mobile=%s auth_sync=%s\n' \
    "${base_ref}" "${head_ref}" "$(bool "${result_run_deploy}")" "$(bool "${result_app_code}")" \
    "$(bool "${result_run_web}")" "$(bool "${result_run_mobile}")" "$(bool "${result_run_auth_sync}")" >&2
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
      integration_tests) [[ "${match_integration_tests}" == true ]] && got=true ;;
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

  assert_derived() {
    local label="$1"
    shift
    local -a fields=()
    local -a wants=()
    local -a paths=()

    while [[ $# -gt 0 && "$1" != "--" ]]; do
      fields+=("$1")
      wants+=("$2")
      shift 2
    done
    shift
    paths=("$@")

    aggregate_paths "${paths[@]}"

    local i field want got
    for i in "${!fields[@]}"; do
      field="${fields[$i]}"
      want="${wants[$i]}"
      got=false
      case "${field}" in
        run_supabase) [[ "${result_run_supabase}" == true ]] && got=true ;;
        run_supabase_reset) [[ "${result_run_supabase_reset}" == true ]] && got=true ;;
        run_unit) [[ "${result_run_unit}" == true ]] && got=true ;;
        run_migration_filenames) [[ "${result_run_migration_filenames}" == true ]] && got=true ;;
        run_mobile) [[ "${result_run_mobile}" == true ]] && got=true ;;
        run_web) [[ "${result_run_web}" == true ]] && got=true ;;
        run_deploy) [[ "${result_run_deploy}" == true ]] && got=true ;;
        integration_tests) [[ "${result_integration_tests}" == true ]] && got=true ;;
        supabase_schema) [[ "${result_supabase_schema}" == true ]] && got=true ;;
        *)
          printf 'self-test FAIL: unknown derived field %s\n' "${field}" >&2
          failed=1
          continue
          ;;
      esac
      if [[ "${got}" != "${want}" ]]; then
        printf 'self-test FAIL: %s derived %s expected %s got %s (paths: %s)\n' \
          "${label}" "${field}" "${want}" "${got}" "${paths[*]:-"(none)"}" >&2
        failed=1
      fi
    done
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
  assert_classify adopter/mobile/screens/DashboardScreen.tsx mobile_deploy true
  assert_classify adopter/mobile/screens/DashboardScreen.tsx app_code true
  assert_classify adopter/mobile/screens/DashboardScreen.tsx web_deploy false
  assert_classify adopter/web/pages/DashboardPage.tsx web_deploy true
  assert_classify adopter/web/pages/DashboardPage.tsx mobile_deploy false
  assert_classify adopter/config/billing.ts web_deploy true
  assert_classify adopter/config/billing.ts mobile_deploy true
  assert_classify adopter/config/billing.ts app_code true
  assert_classify adopter/db/init.sql supabase_schema true
  assert_classify adopter/db/init.sql app_code true
  assert_classify adopter/db/migrations/001.sql supabase_schema true
  assert_classify scripts/db-apply-adopter.mjs supabase_schema true
  assert_classify scripts/db-apply-adopter.mjs tested_scripts true
  assert_classify scripts/db-init-adopter.mjs supabase_schema true
  assert_classify scripts/lib/resolve-adopter-database-url.mjs supabase_schema true
  assert_derived adopter-db-script-push \
    run_supabase true run_migration_filenames true \
    -- scripts/db-apply-adopter.mjs scripts/lib/resolve-adopter-database-url.mjs
  assert_derived adopter-db-init-sql \
    run_supabase true run_migration_filenames true run_supabase_reset true \
    supabase_schema true \
    -- adopter/db/init.sql
  assert_classify packages/adopter-tests/jest.mobile.cjs app_code true
  assert_classify packages/adopter-tests/jest.mobile.cjs mobile_deploy false
  assert_derived adopter-mobile-test-only-push \
    run_mobile true run_web false run_deploy true \
    -- adopter/mobile/screens/__tests__/DashboardScreen.test.tsx
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
  assert_classify packages/help/src/components/HelpContent.web.tsx web_deploy true
  assert_classify packages/help/src/components/HelpContent.web.test.tsx web_deploy false
  assert_classify packages/articles/src/components/ArticlesIndex.web.tsx web_deploy true
  assert_classify adopter/content/help.md web_deploy true
  assert_classify adopter/content/help.md mobile_deploy false
  assert_classify adopter/content/articles/getting-started-with-beaker-stack.md web_deploy true
  assert_derived help-content-markdown-push \
    run_unit true run_web true \
    -- adopter/content/help.md
  assert_derived articles-content-markdown-push \
    run_unit true run_web true \
    -- adopter/content/articles/getting-started-with-beaker-stack.md
  assert_classify tests/integration/auth.test.ts app_code true
  assert_classify tests/integration/auth.test.ts integration_tests true
  assert_classify tests/integration/auth.test.ts supabase_schema false
  assert_classify tests/utils/test-clients.ts integration_tests true
  assert_classify tests/jest.integration.config.js integration_tests true
  assert_classify tests/e2e/web/flows/home.yaml app_code true
  assert_classify tests/e2e/web/flows/home.yaml integration_tests false

  assert_derived integration-only-changes \
    run_supabase true run_supabase_reset false run_unit true run_migration_filenames false \
    integration_tests true supabase_schema false \
    -- tests/integration/auth.test.ts tests/integration/auth-rls.test.ts
  assert_derived package-unit-test-only \
    run_supabase false run_unit true integration_tests false \
    -- packages/billing/src/hooks/useCheckout.test.ts
  assert_derived supabase-schema-changes \
    run_supabase true run_supabase_reset true run_migration_filenames true \
    supabase_schema true integration_tests false \
    -- supabase/migrations/001.sql
  assert_derived integration-utils-changes \
    run_supabase true run_supabase_reset false integration_tests true \
    -- tests/utils/test-clients.ts

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
