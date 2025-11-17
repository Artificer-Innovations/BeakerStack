#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MOBILE_APP_DIR="${REPO_ROOT}/apps/mobile"

DEFAULT_CHANNEL="staging"
DEFAULT_PLATFORM="all"
DEFAULT_MESSAGE="Staging deployment update"
DEFAULT_EXPO_PROJECT_SLUG="beaker-stack"

CHANNEL="${DEFAULT_CHANNEL}"
PLATFORM="${DEFAULT_PLATFORM}"
UPDATE_MESSAGE="${DEFAULT_MESSAGE}"
EXPO_ACCOUNT=""
EXPO_PROJECT_SLUG="${DEFAULT_EXPO_PROJECT_SLUG}"
OUTPUT_ENV=""
DRY_RUN=false
PROJECT_DIR="${MOBILE_APP_DIR}"

EAS_BIN=(npx --yes eas-cli)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Publishes an Expo EAS Update for staging, targeting the staging channel.

Required:
  --expo-account ACCOUNT         Expo account slug (e.g., artificerinnovations)

Optional:
  --project-dir PATH             Path to the Expo project (default: ${PROJECT_DIR})
  --expo-project SLUG            Expo project slug (default: ${DEFAULT_EXPO_PROJECT_SLUG})
  --channel CHANNEL              Channel name (default: ${DEFAULT_CHANNEL})
  --platform [all|ios|android]   Platform target for EAS Update (default: ${DEFAULT_PLATFORM})
  --message TEXT                 Custom update message (default: "${DEFAULT_MESSAGE}")
  --env-file PATH                Write outputs to PATH (KEY=VALUE format)
  --dry-run                      Log commands without executing
  --help                         Show this help message

Environment variables:
  EXPO_TOKEN                     Required for non-interactive EAS commands
  EXPO_PROJECT_ID                Required if .eas/project.json is absent
  STAGING_SUPABASE_URL           Supabase URL for staging
  STAGING_SUPABASE_ANON_KEY      Supabase anon key for staging

Outputs:
  STAGING_MOBILE_CHANNEL         Expo Update channel name
  STAGING_MOBILE_UPDATE_URL      Expo URL to view the latest update
EOF
}

log() {
  local level="$1"
  shift
  printf '[%-5s] %s\n' "${level}" "$*"
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
  command -v node >/dev/null 2>&1 || {
    log "ERROR" "node is required."
    exit 1
  }
  command -v npm >/dev/null 2>&1 || {
    log "ERROR" "npm is required."
    exit 1
  }
  command -v npx >/dev/null 2>&1 || {
    log "ERROR" "npx is required."
    exit 1
  }
  command -v jq >/dev/null 2>&1 || {
    log "ERROR" "jq is required for parsing EAS JSON output."
    exit 1
  }
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --expo-account)
        EXPO_ACCOUNT="$2"
        shift 2
        ;;
      --project-dir)
        PROJECT_DIR="$2"
        shift 2
        ;;
      --expo-project)
        EXPO_PROJECT_SLUG="$2"
        shift 2
        ;;
      --channel)
        CHANNEL="$2"
        shift 2
        ;;
      --platform)
        PLATFORM="$2"
        shift 2
        ;;
      --message)
        UPDATE_MESSAGE="$2"
        shift 2
        ;;
      --env-file)
        OUTPUT_ENV="$2"
        : >"${OUTPUT_ENV}"
        shift 2
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
        log "ERROR" "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "${EXPO_ACCOUNT}" ]]; then
    log "ERROR" "--expo-account is required."
    exit 1
  fi

  if [[ ! -d "${PROJECT_DIR}" ]]; then
    log "ERROR" "Project directory not found: ${PROJECT_DIR}"
    exit 1
  fi
}

run_eas() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "eas $*"
    return 0
  fi

  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    log "ERROR" "EXPO_TOKEN is required for non-interactive EAS commands."
    exit 1
  fi

  (cd "${PROJECT_DIR}" && EXPO_TOKEN="${EXPO_TOKEN}" "${EAS_BIN[@]}" "$@")
}

ensure_project_configured() {
  if [[ -f "${PROJECT_DIR}/.eas/project.json" ]]; then
    return
  fi

  if [[ -z "${EXPO_PROJECT_ID:-}" ]]; then
    log "ERROR" ".eas/project.json not found. Set EXPO_PROJECT_ID or check in the generated file from 'eas init'."
    exit 1
  fi

  log "INFO" "Configuring Expo project for CI (creating .eas/project.json)..."
  run_eas init --id "${EXPO_PROJECT_ID}" --non-interactive --force >/dev/null

  if [[ ! -f "${PROJECT_DIR}/.eas/project.json" ]]; then
    log "ERROR" "Failed to configure Expo project automatically. Run 'eas init' locally and commit .eas/project.json."
    exit 1
  fi
}

ensure_channel() {
  log "INFO" "Ensuring Expo channel ${CHANNEL} exists..."
  if ! run_eas channel:view "${CHANNEL}" --json >/dev/null 2>&1; then
    run_eas channel:create "${CHANNEL}" --non-interactive --json || log "WARN" "Channel may already exist: ${CHANNEL}"
  fi
}

publish_update() {
  log "INFO" "Publishing EAS Update to channel ${CHANNEL}..."
  run_eas update --channel "${CHANNEL}" --message "${UPDATE_MESSAGE}" --platform "${PLATFORM}" --non-interactive --json || {
    log "ERROR" "Failed to publish Expo update."
    exit 1
  }
}

fetch_latest_update_urls() {
  local update_json update_id update_group project_url
  project_url="https://expo.dev/accounts/${EXPO_ACCOUNT}/projects/${EXPO_PROJECT_SLUG}/updates/${CHANNEL}"

  if [[ "${DRY_RUN}" == true ]]; then
    write_output "STAGING_MOBILE_CHANNEL" "${CHANNEL}"
    write_output "STAGING_MOBILE_UPDATE_URL" "${project_url}"
    return
  fi

  update_json="$(run_eas update:list --channel "${CHANNEL}" --limit 1 --json)"

  if [[ -z "${update_json}" || "${update_json}" == "[]" ]]; then
    log "WARN" "No updates found on channel ${CHANNEL} yet."
  else
    update_id="$(echo "${update_json}" | jq -r '.[0].id')"
    update_group="$(echo "${update_json}" | jq -r '.[0].group')"
    log "INFO" "Latest update ID: ${update_id} (group ${update_group})"
  fi

  write_output "STAGING_MOBILE_CHANNEL" "${CHANNEL}"
  write_output "STAGING_MOBILE_UPDATE_URL" "${project_url}"

  log "INFO" "Staging update available at ${project_url}"
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled; no Expo changes will be made."
  fi

  ensure_project_configured
  ensure_channel
  publish_update
  fetch_latest_update_urls

  log "INFO" "Staging mobile deployment completed."
}

main "$@"

