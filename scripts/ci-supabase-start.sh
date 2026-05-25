#!/usr/bin/env bash
# Start a minimal local Supabase stack for Tier 1 CI (integration + pgTAP).
set -euo pipefail

mkdir -p .supabase/logs

# Excludes UI, edge, analytics, mail, pooler, and other services tests do not need.
supabase start \
  -x studio,imgproxy,edge-runtime,analytics,mailpit,logflare,vector,supavisor,postgres-meta \
  > .supabase/logs/start.log 2>&1

supabase status > .supabase/logs/status.log 2>&1
cat .supabase/logs/status.log
