/* eslint-disable no-console -- CLI */
/**
 * Revoke app-wide admin from a user by email.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:revoke -- you@example.com
 */
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { loadSupabaseServiceEnv } from './lib/loadSupabaseServiceEnv.js';

function parseArgs(argv: string[]) {
  let dryRun = false;
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg !== undefined) positional.push(arg);
  }
  return { dryRun, email: positional[0]?.trim() };
}

async function main() {
  const { dryRun, email } = parseArgs(process.argv);
  if (!email) {
    console.error('Usage: npm run admin:revoke -- <email> [--dry-run]');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`[dry-run] Would revoke admin from: ${email}`);
    return;
  }

  let url: string;
  let serviceKey: string;
  try {
    ({ url, serviceKey } = loadSupabaseServiceEnv());
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const match = users.users.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!match) {
    console.error(`No auth user found with email: ${email}`);
    process.exit(1);
  }

  const { error: updateErr } = await supabase
    .from('admin_users')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', match.id)
    .is('revoked_at', null);

  if (updateErr) {
    console.error('Failed to revoke admin:', updateErr.message);
    process.exit(1);
  }

  console.log(`Revoked admin from ${email} (${match.id})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
