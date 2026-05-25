/* eslint-disable no-console -- CLI */
/**
 * Grant app-wide admin to a user by email.
 *
 *   npm run admin:grant -- operator@example.com
 *   npm run admin:grant -- operator@example.com --granted-by you@example.com
 *   npm run admin:grant -- operator@example.com --dry-run
 *
 * `granted_by` is set when --granted-by matches an existing auth user (the person
 * running the grant). Service-role-only grants without --granted-by leave it null.
 */
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { findAuthUserByEmail } from './lib/findAuthUserByEmail.js';
import { loadSupabaseServiceEnv } from './lib/loadSupabaseServiceEnv.js';

function parseArgs(argv: string[]) {
  let dryRun = false;
  let grantedByEmail: string | undefined;
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--granted-by') {
      grantedByEmail = argv[++i]?.trim();
    } else if (arg !== undefined) positional.push(arg);
  }
  return { dryRun, email: positional[0]?.trim(), grantedByEmail };
}

async function main() {
  const { dryRun, email, grantedByEmail } = parseArgs(process.argv);
  if (!email) {
    console.error(
      'Usage: npm run admin:grant -- <email> [--granted-by <email>] [--dry-run]'
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log(`[dry-run] Would grant admin to: ${email}`);
    if (grantedByEmail) {
      console.log(`[dry-run] granted_by would be set from: ${grantedByEmail}`);
    }
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

  let grantedById: string | null = null;
  if (grantedByEmail) {
    try {
      const granter = await findAuthUserByEmail(supabase, grantedByEmail);
      if (!granter) {
        console.error(
          `No auth user found for --granted-by email: ${grantedByEmail}`
        );
        process.exit(1);
      }
      grantedById = granter.id;
    } catch (e) {
      console.error(
        'Failed to resolve --granted-by user:',
        e instanceof Error ? e.message : e
      );
      process.exit(1);
    }
  }

  const { error: upsertErr } = await supabase.from('admin_users').upsert(
    {
      user_id: match.id,
      revoked_at: null,
      granted_at: new Date().toISOString(),
      granted_by: grantedById,
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
