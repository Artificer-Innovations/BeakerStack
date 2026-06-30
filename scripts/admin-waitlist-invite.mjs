#!/usr/bin/env node
/**
 * Admin CLI: invite a waitlist email (optional VIP comp on signup).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... BEAKERSTACK_ADMIN_EMAIL=... BEAKERSTACK_ADMIN_PASSWORD=... \
 *     npm run admin:invite -- --email user@example.com [--vip] [--reason "Design partner"]
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    vip: { type: 'boolean', default: false },
    reason: { type: 'string' },
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

const email = values.email?.trim().toLowerCase();
if (!email) {
  console.error('--email is required');
  process.exit(1);
}

if (values.vip && !values.reason?.trim()) {
  console.error('--reason is required when --vip is set');
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

const provisioningIntent = values.vip
  ? {
      kind: 'billing_comp',
      planId: compPlanIds[0] ?? 'beakerstack_vip',
      reason: values.reason.trim(),
    }
  : null;

const { data, error } = await supabase.rpc('admin_invite_waitlist_email', {
  p_email: email,
  p_metadata: {},
  p_provisioning_intent: provisioningIntent,
  p_update_provisioning_intent: values.vip,
  p_allowed_comp_plan_ids: compPlanIds,
});

if (error || data?.error) {
  console.error('Invite failed:', error?.message ?? data?.error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
