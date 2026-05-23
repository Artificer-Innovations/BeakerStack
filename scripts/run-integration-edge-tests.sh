#!/usr/bin/env bash
# Ensure local Supabase + Edge Functions are running, then run Tier 2 integration tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
PID_FILE="$ROOT/.supabase/integration-edge-functions.pid"
LOG_FILE="$ROOT/.supabase/logs/functions-serve.log"
WE_STARTED_FUNCTIONS=0

info() { echo "[integration:edge] $*"; }
warn() { echo "[integration:edge] WARNING: $*" >&2; }

functions_probe_url() {
  echo "${SUPABASE_URL%/}/functions/v1/waitlist-capture"
}

wait_for_functions() {
  local probe
  probe="$(functions_probe_url)"
  local attempts="${1:-60}"
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if curl -sf -X OPTIONS "$probe" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  return 1
}

functions_running() {
  curl -sf -X OPTIONS "$(functions_probe_url)" >/dev/null 2>&1
}

load_supabase_env() {
  if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
    return 0
  fi
  if ! supabase status >/dev/null 2>&1; then
    return 1
  fi
  local line key val
  while IFS= read -r line; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [ -z "$line" ] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    case "$key" in
      API_URL) export SUPABASE_URL="$val" ;;
      ANON_KEY) export SUPABASE_ANON_KEY="$val" ;;
      SERVICE_ROLE_KEY) export SUPABASE_SERVICE_ROLE_KEY="$val" ;;
    esac
  done < <(supabase status -o env 2>/dev/null)
  export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
}

ensure_supabase() {
  if supabase status >/dev/null 2>&1; then
    info "Supabase is already running"
    load_supabase_env || true
    return 0
  fi

  info "Starting Supabase (includes Edge runtime)…"
  mkdir -p "$ROOT/.supabase/logs"
  supabase start -x studio,imgproxy,inbucket,analytics
  load_supabase_env
  info "Supabase started"
}

start_functions_serve() {
  mkdir -p "$(dirname "$LOG_FILE")"
  local env_args=()
  if [ -f "$ROOT/supabase/.env.local" ]; then
    env_args=(--env-file "$ROOT/supabase/.env.local")
  else
    warn "supabase/.env.local not found — billing checkout test may skip without STRIPE_SECRET_KEY"
  fi

  info "Syncing edge shared packages…"
  npm run functions:sync-shared

  info "Starting supabase functions serve (background, log: $LOG_FILE)"
  # shellcheck disable=SC2086
  supabase functions serve --no-verify-jwt "${env_args[@]}" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  WE_STARTED_FUNCTIONS=1

  if ! wait_for_functions 60; then
    warn "Edge functions did not become ready. Last log lines:"
    tail -n 40 "$LOG_FILE" >&2 || true
    exit 1
  fi
  info "Edge functions are ready"
}

ensure_functions() {
  if functions_running; then
    info "Edge functions already reachable at $(functions_probe_url)"
    return 0
  fi

  if [ -f "$PID_FILE" ]; then
    local old_pid
    old_pid="$(cat "$PID_FILE")"
    if kill -0 "$old_pid" 2>/dev/null; then
      info "Waiting for existing functions serve (pid $old_pid)…"
      if wait_for_functions 30; then
        return 0
      fi
      warn "Stale functions pid $old_pid — starting a new serve process"
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  start_functions_serve
}

cleanup() {
  if [ "$WE_STARTED_FUNCTIONS" = "1" ] && [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE")"
    info "Stopping functions serve (pid $pid)"
    kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
}

trap cleanup EXIT

# CI workflow starts services explicitly before npm run
if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  command -v supabase >/dev/null 2>&1 || {
    echo "[integration:edge] ERROR: supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
    exit 1
  }
  command -v curl >/dev/null 2>&1 || {
    echo "[integration:edge] ERROR: curl is required for readiness checks" >&2
    exit 1
  }
  ensure_supabase
  ensure_functions
else
  info "CI detected — assuming Supabase and Edge Functions are already up"
fi

export RUN_INTEGRATION_EDGE_TESTS=1
export SUPABASE_URL

info "Running Edge integration tests…"
set +e
npx jest --config tests/jest.integration.edge.config.js --forceExit "$@"
exit_code=$?
set -e
exit "$exit_code"
