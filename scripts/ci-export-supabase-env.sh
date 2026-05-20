#!/usr/bin/env bash
# Write local Supabase CLI credentials to GITHUB_ENV (no hardcoded JWTs in workflows).
set -euo pipefail

target="${1:-${GITHUB_ENV:-}}"
if [ -z "$target" ]; then
  echo "ci-export-supabase-env: pass output path or set GITHUB_ENV (Actions only)" >&2
  exit 1
fi

if ! supabase status >/dev/null 2>&1; then
  echo "ci-export-supabase-env: supabase is not running" >&2
  exit 1
fi

while IFS= read -r line; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [ -z "$line" ] && continue
  key="${line%%=*}"
  val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  case "$key" in
    API_URL)
      echo "SUPABASE_URL=$val" >>"$target"
      echo "VITE_SUPABASE_URL=$val" >>"$target"
      ;;
    ANON_KEY)
      echo "SUPABASE_ANON_KEY=$val" >>"$target"
      echo "VITE_SUPABASE_ANON_KEY=$val" >>"$target"
      ;;
    SERVICE_ROLE_KEY) echo "SUPABASE_SERVICE_ROLE_KEY=$val" >>"$target" ;;
  esac
done < <(supabase status -o env 2>/dev/null)

if [ "${CI_EXPORT_EDGE_TESTS:-0}" = "1" ]; then
  echo "RUN_INTEGRATION_EDGE_TESTS=1" >>"$target"
fi
