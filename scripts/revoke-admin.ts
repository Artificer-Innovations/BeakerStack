/* eslint-disable no-console -- CLI */
/**
 * Revoke app-wide admin from a user by email.
 *
 *   npm run admin:revoke -- you@example.com
 */
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { findAuthUserByEmail } from './lib/findAuthUserByEmail.js';
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

  let match;
  try {
    match = await findAuthUserByEmail(supabase, email);
  } catch (listErr) {
    console.error(
      'Failed to list users:',
      listErr instanceof Error ? listErr.message : listErr
    );
    process.exit(1);
  }

  if (!match) {
    console.error(`No auth user found with email: ${email}`);
    process.exit(1);
  }

  const { data, error: updateErr } = await supabase
    .from('admin_users')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', match.id)
    .is('revoked_at', null)
    .select('user_id');

  if (updateErr) {
    console.error('Failed to revoke admin:', updateErr.message);
    process.exit(1);
  }

  if (!data?.length) {
    console.error(
      `${email} is not an active admin (already revoked or never granted)`
    );
    process.exit(1);
  }

  console.log(`Revoked admin from ${email} (${match.id})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
