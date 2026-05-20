/**
 * Shared fixtures for Jest integration tests (admin, waitlist, teardown).
 */

import { generateIntegrationTestEmail } from './test-emails';
import { createServiceRoleClient } from './test-clients';

export type SignupMode = 'open' | 'waitlist' | 'invite_only' | 'closed';

const PRODUCT_ID = 'beakerstack';

export function uniqueTestEmail(): string {
  return generateIntegrationTestEmail();
}

export async function grantTestAdmin(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('admin_users')
    .upsert({ user_id: userId, revoked_at: null }, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`grantTestAdmin failed: ${error.message}`);
  }
}

export async function revokeTestAdmin(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('admin_users')
    .delete()
    .eq('user_id', userId);
  if (error) {
    throw new Error(`revokeTestAdmin failed: ${error.message}`);
  }
}

export async function setWaitlistMode(mode: SignupMode): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('waitlist_settings')
    .update({ signup_mode: mode })
    .eq('id', 1);
  if (error) {
    throw new Error(`setWaitlistMode failed: ${error.message}`);
  }
}

export async function captureWaitlistEntry(
  email: string,
  metadata: Record<string, unknown> = {}
): Promise<{ ok?: boolean; message?: string }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('waitlist_capture', {
    p_email: email,
    p_metadata: metadata,
    p_client_ip: '127.0.0.1',
  });
  if (error) {
    throw new Error(`waitlist_capture failed: ${error.message}`);
  }
  return (data ?? {}) as { ok?: boolean; message?: string };
}

export async function findWaitlistEntryByEmail(
  email: string
): Promise<{ id: string; email: string; status: string } | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('waitlist_entries')
    .select('id, email, status')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    throw new Error(`findWaitlistEntryByEmail failed: ${error.message}`);
  }
  return data;
}

/**
 * Remove integration test artifacts for a user (service role).
 */
export async function cleanupIntegrationTestUser(
  userId: string,
  options?: { email?: string }
): Promise<void> {
  const admin = createServiceRoleClient();

  try {
    const { data: files } = await admin.storage.from('avatars').list(userId);
    if (files?.length) {
      const paths = files.map(f => `${userId}/${f.name}`);
      await admin.storage.from('avatars').remove(paths);
    }
  } catch {
    // ignore storage cleanup errors
  }

  await admin
    .from('billing_demo_collections')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID);
  await admin
    .from('billing_usage_events')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID);
  await admin
    .from('billing_usage_aggregates')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID);
  await admin
    .from('billing_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID);

  if (options?.email) {
    const normalized = options.email.toLowerCase().trim();
    const entry = await findWaitlistEntryByEmail(normalized);
    if (entry) {
      await admin.from('waitlist_invites').delete().eq('entry_id', entry.id);
      await admin.from('waitlist_entries').delete().eq('id', entry.id);
    }
  }

  await admin.from('admin_users').delete().eq('user_id', userId);
  await admin.from('user_profiles').delete().eq('user_id', userId);

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    console.warn(
      `cleanupIntegrationTestUser: auth deleteUser warning: ${deleteUserError.message}`
    );
  }
}

export async function resetWaitlistModeOpen(): Promise<void> {
  await setWaitlistMode('open');
}
