#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MOBILE_APP_DIR="${REPO_ROOT}/apps/mobile"

DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_CHANNEL_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
DEFAULT_PLATFORM="all"
DEFAULT_MESSAGE_TEMPLATE="PR #%s preview update"
DEFAULT_EXPO_PROJECT_SLUG="beaker-stack"

PR_NUMBER=""
CHANNEL_PREFIX="${DEFAULT_CHANNEL_PREFIX}"
PLATFORM="${DEFAULT_PLATFORM}"
UPDATE_MESSAGE=""
EXPO_ACCOUNT=""
EXPO_PROJECT_SLUG="${DEFAULT_EXPO_PROJECT_SLUG}"
OUTPUT_ENV=""
DRY_RUN=false
PROJECT_DIR="${MOBILE_APP_DIR}"

EAS_BIN=(npx --yes eas-cli)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Publishes an Expo EAS Update for a pull request preview, targeting a dedicated
channel (e.g., pr-123). The script ensures the branch/channel exist, publishes
the update, and returns handy preview URLs.

Required:
  --pr-number NUMBER             Pull request number
  --expo-account ACCOUNT         Expo account slug (e.g., artificerinnovations)

Optional:
  --project-dir PATH             Path to the Expo project (default: ${PROJECT_DIR})
  --expo-project SLUG            Expo project slug (default: ${DEFAULT_EXPO_PROJECT_SLUG})
  --channel-prefix PREFIX        Prefix for preview channels (default: ${DEFAULT_CHANNEL_PREFIX})
  --platform [all|ios|android]   Platform target for EAS Update (default: ${DEFAULT_PLATFORM})
  --message TEXT                 Custom update message (default: "PR #<number> preview update")
  --env-file PATH                Write outputs to PATH (KEY=VALUE format)
  --dry-run                      Log commands without executing
  --help                         Show this help message

Environment variables:
  EXPO_TOKEN                     Required for non-interactive EAS commands
  EXPO_PROJECT_ID                Required if .eas/project.json is absent (can be found in Expo dashboard)

Outputs:
  PREVIEW_MOBILE_CHANNEL         Expo Update channel name
  PREVIEW_MOBILE_UPDATE_URL      Expo URL to view the latest update
  PREVIEW_MOBILE_INSTALL_URL     Expo go/QR URL for testers (if available)
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
      --pr-number)
        PR_NUMBER="$2"
        shift 2
        ;;
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
      --channel-prefix)
        CHANNEL_PREFIX="$2"
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

  if [[ -z "${PR_NUMBER}" ]]; then
    log "ERROR" "--pr-number is required."
    exit 1
  fi

  if [[ -z "${EXPO_ACCOUNT}" ]]; then
    log "ERROR" "--expo-account is required."
    exit 1
  fi

  if [[ -z "${UPDATE_MESSAGE}" ]]; then
    UPDATE_MESSAGE=$(printf "${DEFAULT_MESSAGE_TEMPLATE}" "${PR_NUMBER}")
  fi

  if [[ ! -d "${PROJECT_DIR}" ]]; then
    log "ERROR" "Project directory not found: ${PROJECT_DIR}"
    exit 1
  fi
}

channel_name() {
  printf '%s%s' "${CHANNEL_PREFIX}" "${PR_NUMBER}"
}

run_eas() {
  local channel
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

ensure_branch_and_channel() {
  local channel
  channel="$(channel_name)"

  log "INFO" "Ensuring Expo branch ${channel} exists..."
  if ! run_eas branch:show "${channel}" --json >/dev/null 2>&1; then
    run_eas branch:create "${channel}" --json --non-interactive || log "WARN" "Branch may already exist: ${channel}"
  fi

  log "INFO" "Ensuring Expo channel ${channel} points to branch ${channel}..."
  if ! run_eas channel:view "${channel}" --json >/dev/null 2>&1; then
    run_eas channel:create "${channel}" --non-interactive --json || log "WARN" "Channel may already exist: ${channel}"
  fi

  run_eas channel:edit "${channel}" --branch "${channel}" --non-interactive >/dev/null 2>&1 || true
}

publish_update() {
  local channel
  channel="$(channel_name)"

  log "INFO" "Publishing EAS Update to branch ${channel}..."
  run_eas update --branch "${channel}" --message "${UPDATE_MESSAGE}" --platform "${PLATFORM}" --non-interactive --json || {
    log "ERROR" "Failed to publish Expo update."
    exit 1
  }
}

get_expo_project_id() {
  # Try to get project ID from .eas/project.json first (most reliable)
  if [[ -f "${PROJECT_DIR}/.eas/project.json" ]]; then
    local project_id
    project_id="$(jq -r '.projectId // empty' "${PROJECT_DIR}/.eas/project.json" 2>/dev/null || true)"
    if [[ -n "${project_id}" && "${project_id}" != "null" ]]; then
      echo "${project_id}"
      return
    fi
  fi

  # Try to get from app.config.ts
  if [[ -f "${PROJECT_DIR}/app.config.ts" ]]; then
    local project_id
    # Look for projectId in eas.projectId or extra.eas.projectId
    project_id="$(grep -E "(projectId|eas.*projectId)" "${PROJECT_DIR}/app.config.ts" | grep -oE "'[a-f0-9-]+'|\"[a-f0-9-]+\"" | head -1 | tr -d "'\"")"
    if [[ -n "${project_id}" ]]; then
      echo "${project_id}"
      return
    fi
  fi

  # Fall back to EXPO_PROJECT_ID environment variable
  if [[ -n "${EXPO_PROJECT_ID:-}" ]]; then
    echo "${EXPO_PROJECT_ID}"
    return
  fi

  # Last resort: try to get from EAS
  local project_info
  project_info="$(run_eas project:info --json 2>/dev/null || true)"
  if [[ -n "${project_info}" ]]; then
    local project_id_from_eas
    project_id_from_eas="$(echo "${project_info}" | jq -r '.id // empty' 2>/dev/null || true)"
    if [[ -n "${project_id_from_eas}" && "${project_id_from_eas}" != "null" ]]; then
      echo "${project_id_from_eas}"
      return
    fi
  fi

  log "ERROR" "Could not determine Expo project ID. Please ensure .eas/project.json exists or set EXPO_PROJECT_ID."
  exit 1
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

  # Last resort: try to get from EAS
  local project_info
  project_info="$(run_eas project:info --json 2>/dev/null || true)"
  if [[ -n "${project_info}" ]]; then
    local owner_from_eas
    owner_from_eas="$(echo "${project_info}" | jq -r '.owner.username // .owner.slug // empty' 2>/dev/null || true)"
    if [[ -n "${owner_from_eas}" && "${owner_from_eas}" != "null" ]]; then
      echo "${owner_from_eas}"
      return
    fi
  fi

  # Default fallback
  echo "${EXPO_ACCOUNT:-artificer-innovations-llc}"
}

fetch_latest_update_urls() {
  local channel project_url install_url expo_owner project_id
  channel="$(channel_name)"
  expo_owner="$(get_expo_owner)"
  project_id="$(get_expo_project_id)"

  # Web dashboard URL (for viewing in browser)
  project_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/updates/${channel}"
  # Dev client URL format (for loading in app) - this is the format the dev client accepts
  dev_client_url="https://u.expo.dev/${project_id}?channel-name=${channel}"
  install_url="${project_url}"

  write_output "PREVIEW_MOBILE_CHANNEL" "${channel}"
  write_output "PREVIEW_MOBILE_UPDATE_URL" "${dev_client_url}"
  write_output "PREVIEW_MOBILE_DASHBOARD_URL" "${project_url}"
  write_output "PREVIEW_MOBILE_INSTALL_URL" "${install_url}"

  log "INFO" "Preview update available at ${project_url}"
  log "INFO" "Dev client URL: ${dev_client_url}"
  log "INFO" "To load in dev client: Enter URL manually → ${dev_client_url}"
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled; no Expo changes will be made."
  fi

  ensure_project_configured
  ensure_branch_and_channel
  publish_update
  fetch_latest_update_urls

  log "INFO" "Mobile preview deployment completed."
}

main "$@"

