import { readFileSync } from 'node:fs';
import {
  captureWaitlistEntry,
  findWaitlistEntryByEmail,
} from '../../../utils/integration-fixtures';
import {
  createServiceRoleClient,
  createWebTestClient,
} from '../../../utils/test-clients';
import { signInTestUser } from '../../../utils/test-helpers';
import { e2eAdminStatePath, type E2eSeedState } from '../env';

async function waitForWaitlistEntry(
  email: string
): Promise<{ id: string; email: string; status: string }> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const entry = await findWaitlistEntryByEmail(email);
    if (entry) {
      return entry;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`waitlist entry not found for ${email}`);
}

export async function seedWaitlistEntry(
  email: string,
  metadata: Record<string, unknown> = {}
): Promise<{ id: string; email: string; status: string }> {
  const result = await captureWaitlistEntry(email, metadata);
  if (!result.ok) {
    throw new Error(
      `seedWaitlistEntry failed for ${email}: ${result.message ?? 'unknown'}`
    );
  }
  return waitForWaitlistEntry(email);
}

export async function approveWaitlistEntryByEmail(
  email: string
): Promise<{ entryId: string; inviteToken: string }> {
  const entry = await waitForWaitlistEntry(email);

  const adminSeed = JSON.parse(
    readFileSync(e2eAdminStatePath, 'utf8')
  ) as E2eSeedState;
  const adminClient = createWebTestClient();
  await signInTestUser(adminClient, adminSeed.email, adminSeed.password);

  const { data, error } = await adminClient.rpc(
    'admin_approve_waitlist_entry',
    {
      p_id: entry.id,
    }
  );
  if (error) {
    throw new Error(`admin_approve_waitlist_entry failed: ${error.message}`);
  }

  const approved = data as {
    ok?: boolean;
    invite_token?: string;
    error?: string;
  };
  if (approved.error || !approved.ok || !approved.invite_token) {
    throw new Error(
      `admin_approve_waitlist_entry failed: ${approved.error ?? 'no invite token'}`
    );
  }

  return { entryId: entry.id, inviteToken: approved.invite_token };
}

export async function deleteWaitlistEntry(entryId: string): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.from('waitlist_invites').delete().eq('entry_id', entryId);
  await admin.from('waitlist_entries').delete().eq('id', entryId);
}
