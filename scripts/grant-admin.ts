/* eslint-disable no-console -- CLI */
/**
 * Grant app-wide admin to a user by email.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:grant -- you@example.com
 *   npm run admin:grant -- you@example.com --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { loadSupabaseServiceEnv } from './lib/loadSupabaseServiceEnv.js';

function parseArgs(argv: string[]) {
  let dryRun = false;
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
    else positional.push(argv[i]!);
  }
  return { dryRun, email: positional[0]?.trim() };
}

async function main() {
  const { dryRun, email } = parseArgs(process.argv);
  if (!email) {
    console.error('Usage: npm run admin:grant -- <email> [--dry-run]');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`[dry-run] Would grant admin to: ${email}`);
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

  const { error: upsertErr } = await supabase.from('admin_users').upsert(
    {
      user_id: match.id,
      revoked_at: null,
      granted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (upsertErr) {
    console.error('Failed to grant admin:', upsertErr.message);
    process.exit(1);
  }

  console.log(`Granted admin to ${email} (${match.id})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
