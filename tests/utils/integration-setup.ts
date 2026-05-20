/**
 * Jest setup: verify local Supabase is reachable before integration tests run.
 */

import { createWebTestClient } from './test-clients';
import { getTestSupabaseConfig } from './test-database';

const SETUP_TIMEOUT_MS = 15_000;

beforeAll(async () => {
  const { supabaseUrl } = getTestSupabaseConfig();
  const client = createWebTestClient();
  const deadline = Date.now() + SETUP_TIMEOUT_MS;

  let lastError: string | undefined;
  while (Date.now() < deadline) {
    const { error } = await client.auth.getSession();
    if (!error) {
      return;
    }
    lastError = error.message;
    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error(
    `Supabase not reachable at ${supabaseUrl} within ${SETUP_TIMEOUT_MS}ms` +
      (lastError ? `: ${lastError}` : '')
  );
}, SETUP_TIMEOUT_MS + 5_000);
