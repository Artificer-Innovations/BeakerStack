#!/usr/bin/env node
/**
 * Admin CLI: set/clear VIP provisioning intent on a pending or approved waitlist entry.
 *
 * Usage:
 *   npm run admin:waitlist-vip -- --entry-id <uuid> [--vip] [--reason "Design partner"]
 *   npm run admin:waitlist-vip -- --entry-id <uuid> --clear
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'entry-id': { type: 'string' },
    vip: { type: 'boolean', default: false },
    reason: { type: 'string' },
    clear: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const adminEmail = process.env.BEAKERSTACK_ADMIN_EMAIL;
const adminPassword = process.env.BEAKERSTACK_ADMIN_PASSWORD;
const compPlanIds = (process.env.WAITLIST_COMP_PLAN_IDS ?? 'beakerstack_vip')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!url || !anonKey || !adminEmail || !adminPassword) {
  console.error(
    'Required: SUPABASE_URL, SUPABASE_ANON_KEY, BEAKERSTACK_ADMIN_EMAIL, BEAKERSTACK_ADMIN_PASSWORD'
  );
  process.exit(1);
}

const entryId = values['entry-id']?.trim();
if (!entryId) {
  console.error('--entry-id is required');
  process.exit(1);
}

if (values.clear && values.vip) {
  console.error('Use either --clear or --vip, not both');
  process.exit(1);
}

if (values.vip && !values.reason?.trim()) {
  console.error('--reason is required when --vip is set');
  process.exit(1);
}

if (!values.clear && !values.vip) {
  console.error('Pass --vip with --reason, or --clear');
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
if (signInErr) {
  console.error('Admin sign-in failed:', signInErr.message);
  process.exit(1);
}

const provisioningIntent = values.clear
  ? null
  : {
      kind: 'billing_comp',
      planId: compPlanIds[0] ?? 'beakerstack_vip',
      reason: values.reason.trim(),
    };

const { data, error } = await supabase.rpc(
  'admin_set_waitlist_entry_provisioning_intent',
  {
    p_entry_id: entryId,
    p_provisioning_intent: provisioningIntent,
    p_allowed_comp_plan_ids: compPlanIds,
  }
);

if (error || data?.error) {
  console.error('Set intent failed:', error?.message ?? data?.error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
