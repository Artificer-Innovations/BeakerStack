# Shared retry helper for Supabase CLI calls in CI (transient 504s, network blips).
# shellcheck shell=bash
#
# Usage:
#   source "$(dirname "$0")/lib/supabase-retry.sh"
#   supabase_run "description" supabase link ...

if ! declare -f log >/dev/null 2>&1; then
  log() {
    local level="$1"
    shift
    printf '[%-5s] %s\n' "${level}" "$*"
  }
fi

# Run a command with exponential backoff. Fails after SUPABASE_MAX_RETRIES (default 5).
# Pass --allow-fail as first arg to return 0 after exhausting retries.
supabase_run() {
  local allow_fail=0
  if [[ "${1:-}" == "--allow-fail" ]]; then
    allow_fail=1
    shift
  fi

  local description="$1"
  shift

  if [[ "${DRY_RUN:-false}" == true ]]; then
    log "DRY" "${description}"
    return 0
  fi

  local max_attempts="${SUPABASE_MAX_RETRIES:-5}"
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

    # Treat common Supabase CLI / API errors as failures even if exit code is zero.
    if grep -qiE \
      'failed to connect|cannot find project ref|Error:|error code: 504|\b504\b|gateway timeout|unexpected error retrieving remote project status' \
      "${tmp}"; then
      status=${status:-1}
      if [[ "${status}" -eq 0 ]]; then
        status=1
      fi
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
      return "${status}"
    fi

    log "WARN" "${description} failed (attempt ${attempt}/${max_attempts}); retrying in ${delay}s..."
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
    : >"${tmp}"
  done
}
