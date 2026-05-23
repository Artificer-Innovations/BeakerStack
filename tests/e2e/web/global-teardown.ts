import { readFileSync } from 'node:fs';
import { applyE2eSupabaseEnv, e2eStatePath, type E2eSeedState } from './env';
import { createServiceRoleClient } from '../../utils/test-clients';

async function globalTeardown(): Promise<void> {
  applyE2eSupabaseEnv();

  try {
    const raw = readFileSync(e2eStatePath, 'utf8');
    const seed = JSON.parse(raw) as E2eSeedState;
    const admin = createServiceRoleClient();
    const { error } = await admin.auth.admin.deleteUser(seed.userId);
    if (error) {
      console.warn(`E2E teardown: deleteUser warning: ${error.message}`);
    }
  } catch {
    // State file missing or teardown failed — local DB resets handle leftovers.
  }
}

export default globalTeardown;
