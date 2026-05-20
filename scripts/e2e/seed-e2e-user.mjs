#!/usr/bin/env node
/**
 * Upsert the predefined E2E login user (e2e-valid@example.com) with a known password.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_PASSWORD (or TEST_PASSWORD)
 *
 * Optional:
 *   E2E_LOGIN_EMAIL (default: e2e-valid@example.com)
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_EMAIL = 'e2e-valid@example.com';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`❌ Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = requiredEnv('SUPABASE_URL');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const password =
  process.env.E2E_TEST_PASSWORD?.trim() ||
  process.env.TEST_PASSWORD?.trim() ||
  '';
if (!password) {
  console.error('❌ Missing E2E_TEST_PASSWORD or TEST_PASSWORD');
  process.exit(1);
}

const email = process.env.E2E_LOGIN_EMAIL?.trim() || DEFAULT_EMAIL;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(
      u => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  const existing = await findUserByEmail(email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`✅ Updated E2E user password: ${email}`);
    return;
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`✅ Created E2E user: ${email}`);
}

main().catch(err => {
  console.error('❌ seed-e2e-user failed:', err.message || err);
  process.exit(1);
});
