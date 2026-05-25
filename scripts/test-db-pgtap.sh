#!/usr/bin/env bash
# Apply pending template migrations, then run pgTAP database tests against local Supabase.
set -euo pipefail

supabase migration up --local
supabase test db "$@"
