#!/usr/bin/env bash

# Use set -euo pipefail for strict error handling
# However, we'll make database operations non-blocking so the workflow can continue
set -euo pipefail

supabase_run() {
  local allow_fail=0
  if [[ "${1:-}" == "--allow-fail" ]]; then
    allow_fail=1
    shift
  fi

  local description="$1"
  shift

  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "${description}"
    return 0
  fi

  local max_attempts="${SUPABASE_MAX_RETRIES:-3}"
  local attempt=1
  local delay=5

  local tmp
  tmp="$(mktemp)"

  while true; do
    local status
    if "$@" >"${tmp}" 2>&1; then
      status=0
    else
      status=$?
    fi

    # Treat common Supabase CLI error messages as failures even if exit code is zero.
    if grep -qiE "failed to connect|cannot find project ref|Error:" "${tmp}"; then
      status=${status:-1}
    fi

    cat "${tmp}"

    if (( status == 0 )); then
      rm -f "${tmp}"
      return 0
    fi

    if (( attempt >= max_attempts )); then
      rm -f "${tmp}"
      if (( allow_fail )); then
        log "WARN" "${description} failed after ${attempt} attempt(s); continuing. (exit ${status})"
        return 0
      fi
      log "ERROR" "${description} failed after ${attempt} attempt(s). (exit ${status})"
      return ${status}
    fi

    log "WARN" "${description} failed (attempt ${attempt}/${max_attempts}); retrying in ${delay}s..."
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
    : >"${tmp}"
  done
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEFAULT_PROJECT_REF="${SUPABASE_PREVIEW_PROJECT_REF:-}"
DEFAULT_DB_PASSWORD="${SUPABASE_PREVIEW_DB_PASSWORD:-}"
DEFAULT_BASELINE_REF="origin/main"
DEFAULT_SUPABASE_CONFIG_DIR="${REPO_ROOT}/supabase"

SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-${SUPABASE_PREVIEW_ACCESS_TOKEN:-}}"

DRY_RUN=false
PR_NUMBER=""
PROJECT_REF="${DEFAULT_PROJECT_REF}"
DB_PASSWORD="${DEFAULT_DB_PASSWORD}"
BASELINE_REF="${DEFAULT_BASELINE_REF}"
SUPABASE_CONFIG_DIR="${DEFAULT_SUPABASE_CONFIG_DIR}"
SUPABASE_RUNTIME_DIR="${DEFAULT_SUPABASE_CONFIG_DIR}"
TEMP_SUPABASE_DIR=""
SKIP_IF_UNCHANGED=false
SUPABASE_HAS_CHANGES=true
GENERATE_TYPES=true
RUN_SEED=true
OUTPUT_ENV=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Prepare a Supabase preview database for a pull request. The script links to the
preview Supabase project, resets the database to the baseline migrations, seeds
data, regenerates TypeScript types, and emits connection outputs for workflows.

Required (unless provided via environment variables):
  --project-ref REF              Supabase project ref for the preview environment
  --db-password PASSWORD         Database password for the preview project's Postgres instance

Optional:
  --pr-number NUMBER             Pull request number (for logging/output)
  --baseline-ref REF             Git ref to checkout migrations from (default: ${DEFAULT_BASELINE_REF})
  --config-dir PATH              Path to Supabase config/migrations (default: ${SUPABASE_CONFIG_DIR})
  --env-file PATH                Append outputs to PATH in KEY=VALUE format
  --no-types                     Skip types generation
  --no-seed                      Skip running supabase db seed
  --dry-run                      Print actions without executing mutating commands
  --help                         Show this help message

Environment variables:
  SUPABASE_PREVIEW_PROJECT_REF   Default \`--project-ref\`
  SUPABASE_PREVIEW_DB_PASSWORD   Default \`--db-password\`
  SUPABASE_PREVIEW_ACCESS_TOKEN  Optional Supabase access token (falls back to SUPABASE_ACCESS_TOKEN)

Outputs (written to env-file / GITHUB_OUTPUT if available):
  PREVIEW_PR_NUMBER
  PREVIEW_SUPABASE_PROJECT_REF
  PREVIEW_SUPABASE_DB_PASSWORD
EOF
}

log() {
  local level="$1"
  shift
  printf '[%-5s] %s\n' "${level}" "$*"
}

run_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    local printable=("$@")
    for i in "${!printable[@]}"; do
      if [[ -n "${SUPABASE_ACCESS_TOKEN}" && "${printable[$i]}" == *"${SUPABASE_ACCESS_TOKEN}"* ]]; then
        printable[$i]="${printable[$i]//${SUPABASE_ACCESS_TOKEN}/***}"
      fi
      if [[ -n "${DB_PASSWORD}" && "${printable[$i]}" == *"${DB_PASSWORD}"* ]]; then
        printable[$i]="${printable[$i]//${DB_PASSWORD}/***}"
      fi
    done
    log "DRY" "${printable[*]}"
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
  command -v supabase >/dev/null 2>&1 || {
    log "ERROR" "Supabase CLI is required. Install with: npm install -g supabase"
    exit 1
  }

  command -v git >/dev/null 2>&1 || {
    log "ERROR" "git is required."
    exit 1
  }

  command -v rsync >/dev/null 2>&1 || {
    log "ERROR" "rsync is required."
    exit 1
  }
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-ref)
        PROJECT_REF="$2"
        shift 2
        ;;
      --db-password)
        DB_PASSWORD="$2"
        shift 2
        ;;
      --pr-number)
        PR_NUMBER="$2"
        shift 2
        ;;
      --baseline-ref)
        BASELINE_REF="$2"
        shift 2
        ;;
      --config-dir)
        SUPABASE_CONFIG_DIR="$2"
        shift 2
        ;;
      --env-file)
        OUTPUT_ENV="$2"
        : >"${OUTPUT_ENV}"
        shift 2
        ;;
      --no-types)
        GENERATE_TYPES=false
        shift
        ;;
      --no-seed)
        RUN_SEED=false
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --skip-if-unchanged)
        SKIP_IF_UNCHANGED=true
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

  if [[ -z "${PROJECT_REF}" ]]; then
    log "ERROR" "--project-ref is required (or SUPABASE_PREVIEW_PROJECT_REF)"
    exit 1
  fi

  if [[ -z "${DB_PASSWORD}" ]]; then
    log "ERROR" "--db-password is required (or SUPABASE_PREVIEW_DB_PASSWORD)"
    exit 1
  fi

  if [[ ! -d "${SUPABASE_CONFIG_DIR}" ]]; then
    log "ERROR" "Supabase config directory not found: ${SUPABASE_CONFIG_DIR}"
    exit 1
  fi
}

checkout_baseline() {
  log "INFO" "Ensuring Supabase migrations are synced with ${BASELINE_REF}..."
  
  # Normalize BASELINE_REF - handle both "main" and "origin/main" formats
  local fetch_ref="${BASELINE_REF}"
  local checkout_ref="${BASELINE_REF}"
  if [[ "${BASELINE_REF}" != origin/* ]]; then
    fetch_ref="${BASELINE_REF}"
    checkout_ref="origin/${BASELINE_REF}"
  else
    fetch_ref="${BASELINE_REF#origin/}"
    checkout_ref="${BASELINE_REF}"
  fi
  
  # Fetch the baseline branch
  if ! run_cmd git fetch origin "${fetch_ref}" --depth=1 2>/dev/null; then
    log "WARN" "Failed to fetch ${fetch_ref} from origin; trying to use existing refs..."
    # Try to use existing refs if fetch fails
    if ! git rev-parse --verify "${checkout_ref}" >/dev/null 2>&1; then
      log "ERROR" "Cannot resolve ${checkout_ref}. Ensure the baseline branch exists."
      return 1
    fi
  fi
  
  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  if [[ "${SKIP_IF_UNCHANGED}" == true ]]; then
    # Compare against the checkout ref (which might be origin/main or just main)
    if git diff --quiet "${checkout_ref}" HEAD -- supabase 2>/dev/null || \
       git diff --quiet "${fetch_ref}" HEAD -- supabase 2>/dev/null; then
      SUPABASE_HAS_CHANGES=false
      log "INFO" "No Supabase directory changes detected relative to ${BASELINE_REF}; skipping Supabase reset."
      return
    fi
  fi

  # Use a temporary worktree so we don't disturb the current workspace
  local worktree_dir
  worktree_dir="$(mktemp -d "${REPO_ROOT}/.supabase-worktree-XXXX")"
  
  # Try checkout_ref first, fallback to fetch_ref
  if ! git worktree add --detach "${worktree_dir}" "${checkout_ref}" >/dev/null 2>&1; then
    log "WARN" "Failed to checkout ${checkout_ref}, trying ${fetch_ref}..."
    if ! git worktree add --detach "${worktree_dir}" "${fetch_ref}" >/dev/null 2>&1; then
      log "ERROR" "Cannot checkout baseline ref ${BASELINE_REF} (tried ${checkout_ref} and ${fetch_ref})"
      rm -rf "${worktree_dir}"
      return 1
    fi
    checkout_ref="${fetch_ref}"
  fi

  TEMP_SUPABASE_DIR="$(mktemp -d "${REPO_ROOT}/.supabase-runtime-XXXX")"
  rsync -a --delete "${worktree_dir}/supabase/" "${TEMP_SUPABASE_DIR}/"
  git worktree remove "${worktree_dir}" --force >/dev/null

  # Overlay current branch migrations to ensure PR-specific changes are included.
  rsync -a "${REPO_ROOT}/supabase/" "${TEMP_SUPABASE_DIR}/"
  SUPABASE_RUNTIME_DIR="${TEMP_SUPABASE_DIR}"
}

link_supabase() {
  log "INFO" "Linking Supabase project ${PROJECT_REF}..."
  # supabase link requires running in the project directory where config.toml lives
  (
    cd "${SUPABASE_RUNTIME_DIR}"
    supabase_run "Link Supabase project" env \
      SUPABASE_DISABLE_KEYRING=1 \
      SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      supabase link \
        --project-ref "${PROJECT_REF}" \
        --password "${DB_PASSWORD}" \
        --yes
  )
}

reset_database() {
  log "INFO" "Resetting Supabase preview database to baseline migrations..."
  (
    cd "${SUPABASE_RUNTIME_DIR}"
    supabase_run "Reset Supabase database" env \
      SUPABASE_DISABLE_KEYRING=1 \
      SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      supabase db reset \
        --linked \
        --yes
  )
}

seed_database() {
  if [[ "${RUN_SEED}" != true ]]; then
    log "INFO" "Skipping seed step (--no-seed provided)."
    return
  fi

  local seed_file="${SUPABASE_RUNTIME_DIR}/seed.sql"
  if [[ ! -f "${seed_file}" ]]; then
    log "WARN" "Seed file not found (${seed_file}); skipping seeding."
    return
  fi

  log "INFO" "Seeding database using ${seed_file}..."
  (
    cd "${SUPABASE_RUNTIME_DIR}"
    supabase_run "Seed Supabase database" env \
      SUPABASE_DISABLE_KEYRING=1 \
      SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      supabase db seed
  )

  supabase_run "Push Supabase migrations" env \
    SUPABASE_DISABLE_KEYRING=1 \
    SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
    supabase db push \
      --linked
}

generate_types() {
  if [[ "${GENERATE_TYPES}" != true ]]; then
    log "INFO" "Skipping TypeScript type generation (--no-types provided)."
    return
  fi

  local shared_types="${REPO_ROOT}/packages/shared/src/types/database.ts"
  local web_types="${REPO_ROOT}/apps/web/src/types/database.ts"
  local mobile_types="${REPO_ROOT}/apps/mobile/src/types/database.ts"
  local tmp_types
  tmp_types="$(mktemp)"

  log "INFO" "Generating TypeScript types..."
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "env SUPABASE_DISABLE_KEYRING=1 SUPABASE_ACCESS_TOKEN=*** supabase gen types typescript --linked > ${tmp_types}"
    log "DRY" "cp ${tmp_types} ${shared_types}"
    log "DRY" "cp ${shared_types} ${web_types}"
    log "DRY" "cp ${shared_types} ${mobile_types}"
    rm -f "${tmp_types}"
    return
  fi

  mkdir -p "$(dirname "${shared_types}")" "$(dirname "${web_types}")" "$(dirname "${mobile_types}")"

  # Generate types to a temporary file first
  local gen_status=1
  (
    cd "${SUPABASE_RUNTIME_DIR}"
    if supabase_run "Generate Supabase types" env \
      SUPABASE_DISABLE_KEYRING=1 \
      SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      supabase gen types typescript \
        --linked >"${tmp_types}" 2>&1; then
      gen_status=0
    fi
  )

  # Validate the generated types file
  if (( gen_status == 0 )) && [[ -s "${tmp_types}" ]]; then
    # Check if the file looks like valid TypeScript (starts with expected patterns)
    if head -n 5 "${tmp_types}" | grep -qE "^(export type|export interface|export namespace|type Database)" 2>/dev/null; then
      # Valid TypeScript types - move to destination
      mv "${tmp_types}" "${shared_types}"
      cp "${shared_types}" "${web_types}"
      cp "${shared_types}" "${mobile_types}"
      log "INFO" "TypeScript types generated and validated successfully."
      return 0
    else
      log "WARN" "Generated types file appears invalid (doesn't start with expected TypeScript patterns)."
      log "WARN" "First few lines of generated file:"
      head -n 10 "${tmp_types}" | while IFS= read -r line; do
        log "WARN" "  ${line}"
      done
      rm -f "${tmp_types}"
      return 1
    fi
  else
    log "WARN" "Type generation failed or produced empty output."
    if [[ -s "${tmp_types}" ]]; then
      log "WARN" "Output from type generation:"
      head -n 20 "${tmp_types}" | while IFS= read -r line; do
        log "WARN" "  ${line}"
      done
    fi
    rm -f "${tmp_types}"
    return 1
  fi
}

restore_types_from_baseline() {
  local shared_types="${REPO_ROOT}/packages/shared/src/types/database.ts"
  local web_types="${REPO_ROOT}/apps/web/src/types/database.ts"
  local mobile_types="${REPO_ROOT}/apps/mobile/src/types/database.ts"
  
  # Normalize BASELINE_REF - handle both "main" and "origin/main" formats
  local checkout_ref="${BASELINE_REF}"
  if [[ "${BASELINE_REF}" != origin/* ]]; then
    checkout_ref="origin/${BASELINE_REF}"
  fi
  
  log "INFO" "Restoring type files from baseline branch ${checkout_ref}..."
  
  # Try to restore from baseline branch
  if git show "${checkout_ref}:packages/shared/src/types/database.ts" >"${shared_types}" 2>/dev/null; then
    cp "${shared_types}" "${web_types}"
    cp "${shared_types}" "${mobile_types}"
    log "INFO" "Type files restored from baseline branch."
    return 0
  else
    log "WARN" "Could not restore type files from baseline branch ${checkout_ref}."
    return 1
  fi
}

unlink_supabase() {
  log "INFO" "Unlinking Supabase project..."
  (
    cd "${SUPABASE_RUNTIME_DIR}"
    supabase_run --allow-fail "Supabase unlink" env \
      SUPABASE_DISABLE_KEYRING=1 \
      SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      supabase unlink \
        --yes
  )
}

cleanup() {
  if [[ -n "${TEMP_SUPABASE_DIR}" && -d "${TEMP_SUPABASE_DIR}" ]]; then
    rm -rf "${TEMP_SUPABASE_DIR}"
  fi
}

trap cleanup EXIT

# Helper to run commands that may fail without exiting the script
run_with_error_handling() {
  local description="$1"
  shift
  
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "${description}"
    return 0
  fi
  
  # Run in a subshell with error handling disabled
  (
    set +e
    "$@"
  )
  local status=$?
  return ${status}
}

main() {
  local db_success=false
  
  parse_args "$@"
  ensure_prereqs

  if [[ -z "${SUPABASE_ACCESS_TOKEN}" ]]; then
    log "WARN" "SUPABASE_ACCESS_TOKEN not set. Supabase CLI commands may prompt for login."
  fi

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled. No changes will be applied."
  fi

  # Attempt checkout - if this fails, we can't continue
  if ! checkout_baseline; then
    log "ERROR" "Failed to checkout baseline; cannot continue."
    return 1
  fi

  # Always restore types from baseline first as a safety measure
  # This ensures we have valid types even if generation fails
  log "INFO" "Restoring type files from baseline branch as a safety measure..."
  restore_types_from_baseline || log "WARN" "Could not restore types from baseline (this is OK if types don't exist yet)."

  # If no changes detected, skip database operations
  if [[ "${SUPABASE_HAS_CHANGES}" != true ]]; then
    log "INFO" "Supabase changes skipped; retaining existing preview database and types."
    db_success=true  # Consider this success since we're intentionally skipping
  else
    # Temporarily disable exit-on-error for database operations
    set +e
    
    # Attempt database operations - continue even if they fail
    log "INFO" "Attempting Supabase database operations..."
    
    if link_supabase && reset_database && seed_database; then
      db_success=true
      log "INFO" "Database reset and seeding completed successfully."
      
      # Generate types only if database operations succeeded
      if generate_types; then
        log "INFO" "TypeScript types generated successfully (overwriting baseline types)."
      else
        log "WARN" "Type generation failed; using baseline types (already restored)."
        db_success=false
      fi
    else
      log "WARN" "Database operations failed (likely network/connectivity issue)."
      log "WARN" "This may be due to Supabase connection timeouts from CI runners."
      log "WARN" "Skipping type generation - using baseline types (already restored)."
      db_success=false
    fi

    # Always try to unlink (non-blocking)
    unlink_supabase || true
    
    # Re-enable exit-on-error for output operations
    set -e
  fi

  # Write outputs regardless of success (these should never fail)
  if [[ -n "${PR_NUMBER}" ]]; then
    write_output "PREVIEW_PR_NUMBER" "${PR_NUMBER}"
  fi
  write_output "PREVIEW_SUPABASE_PROJECT_REF" "${PROJECT_REF}"
  write_output "PREVIEW_SUPABASE_DB_PASSWORD" "${DB_PASSWORD}"
  write_output "SUPABASE_SUCCESS" "${db_success}"

  if [[ "${db_success}" == true ]]; then
    log "INFO" "Supabase preview database prepared successfully."
  else
    log "WARN" "Supabase database operations did not complete successfully."
    log "WARN" "Workflow will continue - preview deployments may still succeed."
  fi
}

# Run main function, but always exit with 0 to allow workflow to continue
# even if database operations fail (web/mobile deploys don't require DB)
main "$@" || true
exit 0

