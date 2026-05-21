#!/usr/bin/env node
// Idempotent: registers (or re-registers) the pg_cron job for kit-sync.
// Calls kit_sync_setup_cron() via Supabase RPC using service-role credentials.
// Run after supabase functions deploy in CI.

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const kitCronSecret = process.env.KIT_CRON_SECRET;

if (!supabaseUrl || !serviceRoleKey || !kitCronSecret) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KIT_CRON_SECRET');
  process.exit(1);
}

const workerUrl = `${supabaseUrl}/functions/v1/kit-sync`;

const res = await fetch(`${supabaseUrl}/rest/v1/rpc/kit_sync_setup_cron`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
  },
  body: JSON.stringify({ p_url: workerUrl, p_secret: kitCronSecret }),
});

if (!res.ok) {
  const body = await res.text().catch(() => '');
  console.error(`kit_sync_setup_cron failed: ${res.status} ${res.statusText}`, body);
  process.exit(1);
}

console.log(`kit-sync cron registered → ${workerUrl} (every 5 min)`);
