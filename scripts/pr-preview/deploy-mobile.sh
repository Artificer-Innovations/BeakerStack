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
BUILD_NATIVE=false
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
  --build-native                 Build native apps (iOS and Android) in addition to publishing OTA update
  --dry-run                      Log commands without executing
  --help                         Show this help message

Environment variables:
  EXPO_TOKEN                     Required for non-interactive EAS commands
  EXPO_PROJECT_ID                Required if .eas/project.json is absent (can be found in Expo dashboard)

Outputs:
  PREVIEW_MOBILE_CHANNEL         Expo Update channel name
  PREVIEW_MOBILE_UPDATE_URL      Expo URL to view the latest update
  PREVIEW_MOBILE_INSTALL_URL     Expo go/QR URL for testers (if available)
  PREVIEW_MOBILE_IOS_BUILD_ID    iOS build ID (if --build-native used)
  PREVIEW_MOBILE_IOS_DOWNLOAD_URL iOS build download URL (if --build-native used)
  PREVIEW_MOBILE_ANDROID_BUILD_ID Android build ID (if --build-native used)
  PREVIEW_MOBILE_ANDROID_DOWNLOAD_URL Android build download URL (if --build-native used)
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
      --build-native)
        BUILD_NATIVE=true
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
  if [[ "${DRY_RUN}" == true ]]; then
    log "DRY" "eas $*"
    return 0
  fi

  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    log "ERROR" "EXPO_TOKEN is required for non-interactive EAS commands."
    exit 1
  fi

  # Pass through environment variables needed for EAS builds
  # These will override the {{VARIABLE_NAME}} placeholders in eas.json
  local env_vars=(
    "EXPO_TOKEN=${EXPO_TOKEN}"
  )
  
  # Add preview environment variables if they're set
  # EXPO_PUBLIC_* prefix is required by Expo for variables embedded in the app bundle
  [[ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" ]] && env_vars+=("EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}")
  [[ -n "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]] && env_vars+=("EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY}")
  # Google Services variables (needed for google-services.json generation during EAS builds)
  [[ -n "${GOOGLE_SERVICES_PROJECT_NUMBER:-}" ]] && env_vars+=("GOOGLE_SERVICES_PROJECT_NUMBER=${GOOGLE_SERVICES_PROJECT_NUMBER}")
  [[ -n "${GOOGLE_SERVICES_PROJECT_ID:-}" ]] && env_vars+=("GOOGLE_SERVICES_PROJECT_ID=${GOOGLE_SERVICES_PROJECT_ID}")
  [[ -n "${GOOGLE_SERVICES_STORAGE_BUCKET:-}" ]] && env_vars+=("GOOGLE_SERVICES_STORAGE_BUCKET=${GOOGLE_SERVICES_STORAGE_BUCKET}")
  [[ -n "${GOOGLE_SERVICES_MOBILESDK_APP_ID:-}" ]] && env_vars+=("GOOGLE_SERVICES_MOBILESDK_APP_ID=${GOOGLE_SERVICES_MOBILESDK_APP_ID}")
  [[ -n "${GOOGLE_SERVICES_ANDROID_CLIENT_ID:-}" ]] && env_vars+=("GOOGLE_SERVICES_ANDROID_CLIENT_ID=${GOOGLE_SERVICES_ANDROID_CLIENT_ID}")
  [[ -n "${GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH:-}" ]] && env_vars+=("GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH=${GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH}")
  [[ -n "${GOOGLE_SERVICES_WEB_CLIENT_ID:-}" ]] && env_vars+=("GOOGLE_SERVICES_WEB_CLIENT_ID=${GOOGLE_SERVICES_WEB_CLIENT_ID}")
  [[ -n "${GOOGLE_SERVICES_IOS_CLIENT_ID:-}" ]] && env_vars+=("GOOGLE_SERVICES_IOS_CLIENT_ID=${GOOGLE_SERVICES_IOS_CLIENT_ID}")
  [[ -n "${GOOGLE_SERVICES_API_KEY:-}" ]] && env_vars+=("GOOGLE_SERVICES_API_KEY=${GOOGLE_SERVICES_API_KEY}")

  # Run EAS command with environment variables
  (cd "${PROJECT_DIR}" && env "${env_vars[@]}" "${EAS_BIN[@]}" "$@")
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

wait_for_build() {
  local build_id="$1"
  local platform="$2"
  local max_wait="${3:-1800}" # 30 minutes default
  local elapsed=0
  local interval=30 # Check every 30 seconds

  log "INFO" "Waiting for ${platform} build ${build_id} to complete..."
  
  while [[ ${elapsed} -lt ${max_wait} ]]; do
    local build_info
    build_info="$(run_eas build:view "${build_id}" --json 2>/dev/null || echo "{}")"
    
    if [[ -z "${build_info}" || "${build_info}" == "{}" ]]; then
      log "WARN" "Could not fetch build status, continuing to wait..."
      sleep "${interval}"
      elapsed=$((elapsed + interval))
      continue
    fi
    
    local status
    status="$(echo "${build_info}" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")"
    
    case "${status}" in
      "finished")
        log "INFO" "${platform} build ${build_id} completed successfully"
        return 0
        ;;
      "errored"|"canceled")
        log "ERROR" "${platform} build ${build_id} failed with status: ${status}"
        return 1
        ;;
      "in-progress"|"in-queue"|"pending")
        log "INFO" "${platform} build ${build_id} status: ${status} (${elapsed}s elapsed)"
        ;;
      *)
        log "WARN" "${platform} build ${build_id} unknown status: ${status}"
        ;;
    esac
    
    sleep "${interval}"
    elapsed=$((elapsed + interval))
  done
  
  log "ERROR" "${platform} build ${build_id} timed out after ${max_wait} seconds"
  return 1
}

build_native_app() {
  local build_message
  build_message="PR #${PR_NUMBER} preview build"
  
  log "INFO" "Starting native builds for PR #${PR_NUMBER}..."
  
  # Verify required environment variables are set
  local missing_vars=()
  [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]] && missing_vars+=("EXPO_PUBLIC_SUPABASE_URL")
  [[ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]] && missing_vars+=("EXPO_PUBLIC_SUPABASE_ANON_KEY")
  
  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    log "ERROR" "Missing required environment variables: ${missing_vars[*]}"
    log "ERROR" "These must be set in the GitHub Actions workflow or passed to the script"
    return 1
  fi
  
  # Build iOS
  log "INFO" "Starting iOS build..."
  local ios_build_output
  ios_build_output="$(run_eas build \
    --platform ios \
    --profile preview \
    --non-interactive \
    --json \
    --message "${build_message}" 2>&1 || true)"
  
  # Extract JSON from output (EAS CLI may output warnings before JSON)
  local ios_json
  ios_json="$(echo "${ios_build_output}" | grep -E '^\s*\{' | jq -s '.[0]' 2>/dev/null || echo "${ios_build_output}" | tail -1)"
  
  local ios_build_id
  ios_build_id="$(echo "${ios_json}" | jq -r '.id // empty' 2>/dev/null || true)"
  
  if [[ -z "${ios_build_id}" || "${ios_build_id}" == "null" ]]; then
    log "ERROR" "Failed to start iOS build"
    log "ERROR" "Build output: ${ios_build_output}"
    log "WARN" "Continuing with Android build even though iOS failed..."
    ios_build_id=""
  else
    log "INFO" "iOS build started: ${ios_build_id}"
  fi
  
  # Build Android (start in parallel or after iOS)
  log "INFO" "Starting Android build..."
  local android_build_output
  android_build_output="$(run_eas build \
    --platform android \
    --profile preview \
    --non-interactive \
    --json \
    --message "${build_message}" 2>&1 || true)"
  
  # Extract JSON from output (EAS CLI may output warnings before JSON)
  local android_json
  android_json="$(echo "${android_build_output}" | grep -E '^\s*\{' | jq -s '.[0]' 2>/dev/null || echo "${android_build_output}" | tail -1)"
  
  local android_build_id
  android_build_id="$(echo "${android_json}" | jq -r '.id // empty' 2>/dev/null || true)"
  
  if [[ -z "${android_build_id}" || "${android_build_id}" == "null" ]]; then
    log "ERROR" "Failed to start Android build"
    log "ERROR" "Build output: ${android_build_output}"
    android_build_id=""
  else
    log "INFO" "Android build started: ${android_build_id}"
  fi
  
  # If both builds failed, return error
  if [[ -z "${ios_build_id}" && -z "${android_build_id}" ]]; then
    log "ERROR" "Both iOS and Android builds failed to start"
    return 1
  fi
  
  # Wait for both builds to complete (only if they were started)
  local ios_success=false
  local android_success=false
  
  if [[ -n "${ios_build_id}" ]]; then
    if wait_for_build "${ios_build_id}" "iOS"; then
      ios_success=true
    fi
  fi
  
  if [[ -n "${android_build_id}" ]]; then
    if wait_for_build "${android_build_id}" "Android"; then
      android_success=true
    fi
  fi
  
  # Get download URLs for completed builds
  if [[ -n "${ios_build_id}" ]]; then
    if [[ "${ios_success}" == true ]]; then
      local ios_build_info
      ios_build_info="$(run_eas build:view "${ios_build_id}" --json 2>/dev/null || echo "{}")"
      local ios_download_url
      ios_download_url="$(echo "${ios_build_info}" | jq -r '.artifacts.buildUrl // .artifacts.url // empty' 2>/dev/null || true)"
      
      if [[ -n "${ios_download_url}" && "${ios_download_url}" != "null" ]]; then
        write_output "PREVIEW_MOBILE_IOS_BUILD_ID" "${ios_build_id}"
        write_output "PREVIEW_MOBILE_IOS_DOWNLOAD_URL" "${ios_download_url}"
        log "INFO" "iOS build download URL: ${ios_download_url}"
      else
        # Fallback: construct URL from build ID
        local expo_owner
        expo_owner="$(get_expo_owner)"
        ios_download_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/builds/${ios_build_id}"
        write_output "PREVIEW_MOBILE_IOS_BUILD_ID" "${ios_build_id}"
        write_output "PREVIEW_MOBILE_IOS_DOWNLOAD_URL" "${ios_download_url}"
        log "INFO" "iOS build available at: ${ios_download_url}"
      fi
    else
      # Build failed or still in progress - output build ID so user can check status
      local expo_owner
      expo_owner="$(get_expo_owner)"
      local ios_status_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/builds/${ios_build_id}"
      write_output "PREVIEW_MOBILE_IOS_BUILD_ID" "${ios_build_id}"
      write_output "PREVIEW_MOBILE_IOS_DOWNLOAD_URL" "${ios_status_url}"
      log "WARN" "iOS build ${ios_build_id} did not complete successfully or is still in progress. Check status at: ${ios_status_url}"
    fi
  fi
  
  if [[ -n "${android_build_id}" ]]; then
    if [[ "${android_success}" == true ]]; then
      local android_build_info
      android_build_info="$(run_eas build:view "${android_build_id}" --json 2>/dev/null || echo "{}")"
      local android_download_url
      android_download_url="$(echo "${android_build_info}" | jq -r '.artifacts.buildUrl // .artifacts.url // empty' 2>/dev/null || true)"
      
      if [[ -n "${android_download_url}" && "${android_download_url}" != "null" ]]; then
        write_output "PREVIEW_MOBILE_ANDROID_BUILD_ID" "${android_build_id}"
        write_output "PREVIEW_MOBILE_ANDROID_DOWNLOAD_URL" "${android_download_url}"
        log "INFO" "Android build download URL: ${android_download_url}"
      else
        # Fallback: construct URL from build ID
        local expo_owner
        expo_owner="$(get_expo_owner)"
        android_download_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/builds/${android_build_id}"
        write_output "PREVIEW_MOBILE_ANDROID_BUILD_ID" "${android_build_id}"
        write_output "PREVIEW_MOBILE_ANDROID_DOWNLOAD_URL" "${android_download_url}"
        log "INFO" "Android build available at: ${android_download_url}"
      fi
    else
      # Build failed or still in progress - output build ID so user can check status
      local expo_owner
      expo_owner="$(get_expo_owner)"
      local android_status_url="https://expo.dev/accounts/${expo_owner}/projects/${EXPO_PROJECT_SLUG}/builds/${android_build_id}"
      write_output "PREVIEW_MOBILE_ANDROID_BUILD_ID" "${android_build_id}"
      write_output "PREVIEW_MOBILE_ANDROID_DOWNLOAD_URL" "${android_status_url}"
      log "WARN" "Android build ${android_build_id} did not complete successfully or is still in progress. Check status at: ${android_status_url}"
    fi
  else
    log "ERROR" "Android build failed to start (missing google-services.json or other prebuild error)"
  fi
  
  if [[ "${ios_success}" != true || "${android_success}" != true ]]; then
    log "WARN" "Some builds failed, but continuing..."
    return 1
  fi
  
  return 0
}

main() {
  parse_args "$@"
  ensure_prereqs

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run mode enabled; no Expo changes will be made."
  fi

  ensure_project_configured
  ensure_branch_and_channel
  
  # Always publish OTA update
  publish_update
  fetch_latest_update_urls
  
  # Conditionally build native apps if requested
  if [[ "${BUILD_NATIVE}" == true ]]; then
    build_native_app || log "WARN" "Native build completed with errors"
  fi

  log "INFO" "Mobile preview deployment completed."
}

main "$@"

