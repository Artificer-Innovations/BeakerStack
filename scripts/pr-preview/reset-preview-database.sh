#!/usr/bin/env bash

set -euo pipefail

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
    log "DRY" "$*"
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

  if ! command -v git >/dev/null 2>&1; then
    log "ERROR" "git is required."
    exit 1
  fi

  if ! command -v rsync >/dev/null 2>&1; then
    log "ERROR" "rsync is required."
    exit 1
  fi
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
  run_cmd "git fetch --depth=1 origin"
  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  # Use a temporary worktree so we don't disturb the current workspace
  local worktree_dir
  worktree_dir="$(mktemp -d "${REPO_ROOT}/.supabase-worktree-XXXX")"
  git worktree add --detach "${worktree_dir}" "${BASELINE_REF}" >/dev/null
  rsync -a --delete "${worktree_dir}/supabase/" "${SUPABASE_CONFIG_DIR}/"
  git worktree remove "${worktree_dir}" --force >/dev/null
}

link_supabase() {
  log "INFO" "Linking Supabase project ${PROJECT_REF}..."
  local cmd="SUPABASE_ACCESS_TOKEN='${SUPABASE_ACCESS_TOKEN}' supabase link --project-ref ${PROJECT_REF} --password ${DB_PASSWORD} --config ${SUPABASE_CONFIG_DIR}/config.toml --non-interactive"
  run_cmd "${cmd}"
}

reset_database() {
  log "INFO" "Resetting Supabase preview database to baseline migrations..."
  local cmd="SUPABASE_ACCESS_TOKEN='${SUPABASE_ACCESS_TOKEN}' supabase db reset --linked --config ${SUPABASE_CONFIG_DIR}/config.toml --non-interactive"
  run_cmd "${cmd}"
}

seed_database() {
  if [[ "${RUN_SEED}" != true ]]; then
    log "INFO" "Skipping seed step (--no-seed provided)."
    return
  fi

  local seed_file="${SUPABASE_CONFIG_DIR}/seed.sql"
  if [[ ! -f "${seed_file}" ]]; then
    log "WARN" "Seed file not found (${seed_file}); skipping seeding."
    return
  fi

  log "INFO" "Seeding database using ${seed_file}..."
  local cmd="SUPABASE_ACCESS_TOKEN='${SUPABASE_ACCESS_TOKEN}' supabase db seed --linked --config ${SUPABASE_CONFIG_DIR}/config.toml"
  run_cmd "${cmd}"
}

generate_types() {
  if [[ "${GENERATE_TYPES}" != true ]]; then
    log "INFO" "Skipping TypeScript type generation (--no-types provided)."
    return
  fi

  local shared_types="${REPO_ROOT}/packages/shared/src/types/database.ts"
  local web_types="${REPO_ROOT}/apps/web/src/types/database.ts"
  local mobile_types="${REPO_ROOT}/apps/mobile/src/types/database.ts"

  log "INFO" "Generating TypeScript types..."
  local cmd="SUPABASE_ACCESS_TOKEN='${SUPABASE_ACCESS_TOKEN}' supabase gen types typescript --linked --config ${SUPABASE_CONFIG_DIR}/config.toml"

  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "${cmd} > ${shared_types}"
    log "DRY" "cp ${shared_types} ${web_types}"
    log "DRY" "cp ${shared_types} ${mobile_types}"
    return
  fi

  mkdir -p "$(dirname "${shared_types}")" "$(dirname "${web_types}")" "$(dirname "${mobile_types}")"
  ${cmd} >"${shared_types}"
  cp "${shared_types}" "${web_types}"
  cp "${shared_types}" "${mobile_types}"
}

unlink_supabase() {
  log "INFO" "Unlinking Supabase project..."
  local cmd="SUPABASE_ACCESS_TOKEN='${SUPABASE_ACCESS_TOKEN}' supabase unlink --config ${SUPABASE_CONFIG_DIR}/config.toml"
  run_cmd "${cmd}"
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ -z "${SUPABASE_ACCESS_TOKEN}" ]]; then
    log "WARN" "SUPABASE_ACCESS_TOKEN not set. Supabase CLI commands may prompt for login."
  fi

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled. No changes will be applied."
  fi

  checkout_baseline
  link_supabase
  reset_database
  seed_database
  generate_types
  unlink_supabase

  if [[ -n "${PR_NUMBER}" ]]; then
    write_output "PREVIEW_PR_NUMBER" "${PR_NUMBER}"
  fi
  write_output "PREVIEW_SUPABASE_PROJECT_REF" "${PROJECT_REF}"
  write_output "PREVIEW_SUPABASE_DB_PASSWORD" "${DB_PASSWORD}"

  log "INFO" "Supabase preview database prepared successfully."
}

main "$@"

