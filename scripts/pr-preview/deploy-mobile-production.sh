#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MOBILE_APP_DIR="${REPO_ROOT}/apps/mobile"

DEFAULT_CHANNEL="production"
DEFAULT_PLATFORM="all"
DEFAULT_MESSAGE="Production deployment update"
DEFAULT_EXPO_PROJECT_SLUG="beaker-stack"

CHANNEL="${DEFAULT_CHANNEL}"
PLATFORM="${DEFAULT_PLATFORM}"
UPDATE_MESSAGE="${DEFAULT_MESSAGE}"
EXPO_ACCOUNT=""
EXPO_PROJECT_SLUG="${DEFAULT_EXPO_PROJECT_SLUG}"
OUTPUT_ENV=""
DRY_RUN=false
PROJECT_DIR="${MOBILE_APP_DIR}"
BUILD_ONLY=false

EAS_BIN=(npx --yes eas-cli)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Builds and optionally publishes an Expo EAS Update for production, targeting the production channel.
Can also build standalone builds for App Store/Play Store submission.

Required:
  --expo-account ACCOUNT         Expo account slug (e.g., artificerinnovations)

Optional:
  --project-dir PATH             Path to the Expo project (default: ${PROJECT_DIR})
  --expo-project SLUG            Expo project slug (default: ${DEFAULT_EXPO_PROJECT_SLUG})
  --channel CHANNEL              Channel name (default: ${DEFAULT_CHANNEL})
  --platform [all|ios|android]   Platform target (default: ${DEFAULT_PLATFORM})
  --message TEXT                 Custom update message (default: "${DEFAULT_MESSAGE}")
  --build-only                   Only build, don't publish update (for store submissions)
  --env-file PATH                Write outputs to PATH (KEY=VALUE format)
  --dry-run                      Log commands without executing
  --help                         Show this help message

Environment variables:
  EXPO_TOKEN                     Required for non-interactive EAS commands
  EXPO_PROJECT_ID                Required if .eas/project.json is absent
  PRODUCTION_SUPABASE_URL        Supabase URL for production
  PRODUCTION_SUPABASE_ANON_KEY   Supabase anon key for production

Outputs:
  PRODUCTION_MOBILE_CHANNEL      Expo Update channel name
  PRODUCTION_MOBILE_UPDATE_URL   Expo URL to view the latest update
  PRODUCTION_MOBILE_BUILD_ID     Build ID (if --build-only)
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
      --build-only)
        BUILD_ONLY=true
        shift
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

  local project_id="${EXPO_PROJECT_ID:-}"

  # Try to get project ID from EAS if not set
  if [[ -z "${project_id}" && -n "${EXPO_ACCOUNT:-}" && -n "${EXPO_PROJECT_SLUG:-}" ]]; then
    log "INFO" "EXPO_PROJECT_ID not set, attempting to look up project ID from EAS..."
    local project_info
    project_info="$(run_eas project:info --json 2>/dev/null || true)"
    if [[ -n "${project_info}" ]]; then
      project_id="$(echo "${project_info}" | jq -r '.id // empty' 2>/dev/null || true)"
      if [[ -n "${project_id}" && "${project_id}" != "null" ]]; then
        log "INFO" "Found project ID: ${project_id}"
      fi
    fi
  fi

  if [[ -z "${project_id}" ]]; then
    log "ERROR" ".eas/project.json not found and EXPO_PROJECT_ID not set."
    log "ERROR" ""
    log "ERROR" "To fix this, either:"
    log "ERROR" "  1. Set EXPO_PROJECT_ID as a GitHub secret (recommended for CI)"
    log "ERROR" "  2. Run 'eas init' locally and commit .eas/project.json to the repository"
    log "ERROR" ""
    log "ERROR" "To get your project ID:"
    log "ERROR" "  - Visit https://expo.dev/accounts/${EXPO_ACCOUNT}/projects/${EXPO_PROJECT_SLUG}"
    log "ERROR" "  - Or run 'eas project:info' locally"
    exit 1
  fi

  log "INFO" "Configuring Expo project for CI (creating .eas/project.json)..."
  run_eas init --id "${project_id}" --non-interactive --force >/dev/null

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

  run_eas channel:edit "${CHANNEL}" --branch "${CHANNEL}" --non-interactive >/dev/null 2>&1 || true
}

build_standalone() {
  local build_json build_id
  log "INFO" "Building standalone app for ${PLATFORM} (profile: production)..."
  
  build_json="$(run_eas build --platform "${PLATFORM}" --profile production --non-interactive --json --no-wait || true)"
  
  if [[ -z "${build_json}" ]]; then
    log "ERROR" "Failed to start build."
    exit 1
  fi
  
  build_id="$(echo "${build_json}" | jq -r '.id // empty')"
  
  if [[ -z "${build_id}" ]]; then
    log "ERROR" "Failed to parse build ID from build output."
    exit 1
  fi
  
  log "INFO" "Build started with ID: ${build_id}"
  write_output "PRODUCTION_MOBILE_BUILD_ID" "${build_id}"
  log "INFO" "Build is running in the background. Check status at: https://expo.dev/accounts/${EXPO_ACCOUNT}/projects/${EXPO_PROJECT_SLUG}/builds/${build_id}"
}

publish_update() {
  log "INFO" "Publishing EAS Update to channel ${CHANNEL}..."
  run_eas update --channel "${CHANNEL}" --message "${UPDATE_MESSAGE}" --platform "${PLATFORM}" --non-interactive --json || {
    log "ERROR" "Failed to publish Expo update."
    exit 1
  }
}

get_expo_owner() {
  # Try to get owner from app.config.ts first
  if [[ -f "${PROJECT_DIR}/app.config.ts" ]]; then
    local owner
    owner="$(grep -E "^\s*owner\s*:" "${PROJECT_DIR}/app.config.ts" | sed -E "s/.*owner\s*:\s*['\"]([^'\"]+)['\"].*/\1/" | head -1)"
    if [[ -n "${owner}" ]]; then
      echo "${owner}"
      return
    fi
  fi

  # Fall back to .eas/project.json
  if [[ -f "${PROJECT_DIR}/.eas/project.json" ]]; then
    local account_name
    account_name="$(jq -r '.accountName // empty' "${PROJECT_DIR}/.eas/project.json" 2>/dev/null || true)"
    if [[ -n "${account_name}" && "${account_name}" != "null" ]]; then
      echo "${account_name}"
      return
    fi
  fi

  # Fall back to EXPO_ACCOUNT if provided
  if [[ -n "${EXPO_ACCOUNT:-}" ]]; then
    echo "${EXPO_ACCOUNT}"
    return
  fi

  # Default fallback
  echo "artificer-innovations-llc"
}

fetch_latest_update_urls() {
  local project_url expo_owner
  expo_owner="$(get_expo_owner)"
  project_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/updates/${CHANNEL}"

  if [[ "${DRY_RUN}" == true ]]; then
    write_output "PRODUCTION_MOBILE_CHANNEL" "${CHANNEL}"
    write_output "PRODUCTION_MOBILE_UPDATE_URL" "${project_url}"
    return
  fi

  write_output "PRODUCTION_MOBILE_CHANNEL" "${CHANNEL}"
  write_output "PRODUCTION_MOBILE_UPDATE_URL" "${project_url}"

  log "INFO" "Production update available at ${project_url}"
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled; no Expo changes will be made."
  fi

  ensure_project_configured
  ensure_channel

  if [[ "${BUILD_ONLY}" == true ]]; then
    build_standalone
  else
    publish_update
    fetch_latest_update_urls
  fi

  log "INFO" "Production mobile deployment completed."
}

main "$@"

