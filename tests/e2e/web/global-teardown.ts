import { readFileSync } from 'node:fs';
import {
  applyE2eSupabaseEnv,
  e2eAdminStatePath,
  e2eStatePath,
  type E2eSeedState,
} from './env';
import { createServiceRoleClient } from '../../utils/test-clients';
import { restorePreviewAuthAfterE2e } from './preview-auth-config';

async function deleteSeedUser(statePath: string): Promise<void> {
  try {
    const raw = readFileSync(statePath, 'utf8');
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

async function globalTeardown(): Promise<void> {
  applyE2eSupabaseEnv();
  await deleteSeedUser(e2eStatePath);
  await deleteSeedUser(e2eAdminStatePath);
  await restorePreviewAuthAfterE2e();
}

export default globalTeardown;
