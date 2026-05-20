/**
 * Waitlist RPC flow: capture, admin approve, invite validate/consume.
 */

import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
} from '../utils/test-helpers';
import {
  captureWaitlistEntry,
  findWaitlistEntryByEmail,
  grantTestAdmin,
  resetWaitlistModeOpen,
  revokeTestAdmin,
  setWaitlistMode,
  uniqueTestEmail,
} from '../utils/integration-fixtures';
import {
  getPublicWaitlistSettings,
  validateInvite,
  consumeInvite,
  listWaitlistEntries,
} from '../../packages/waitlist/src/waitlistClient';

describe('Waitlist flow integration', () => {
  const anon = createWebTestClient();
  const adminClient = createWebTestClient();
  let adminUserId: string;
  let adminEmail: string;
  let adminPassword: string;

  beforeAll(async () => {
    await resetWaitlistModeOpen();
    adminEmail = uniqueTestEmail();
    const adminUser = await createTestUser(adminClient, adminEmail);
    adminUserId = adminUser.userId;
    adminPassword = adminUser.password;
    await grantTestAdmin(adminUserId);
  });

  afterAll(async () => {
    await resetWaitlistModeOpen();
    await revokeTestAdmin(adminUserId);
    await cleanupTestData(adminClient, adminUserId, { email: adminEmail });
  });

  it('returns public waitlist settings for anon', async () => {
    await anon.auth.signOut();
    const settings = await getPublicWaitlistSettings(anon);
    expect(settings).not.toBeNull();
    expect(settings?.signup_mode).toBeDefined();
    expect(settings?.copy).toBeDefined();
  });

  it('captures a waitlist entry via service role RPC', async () => {
    const captureEmail = uniqueTestEmail();
    const result = await captureWaitlistEntry(captureEmail, {
      source: 'integration',
    });
    expect(result.ok).toBe(true);

    const entry = await findWaitlistEntryByEmail(captureEmail);
    expect(entry).not.toBeNull();
    expect(entry?.status).toBe('pending');

    const { createServiceRoleClient } = await import('../utils/test-clients');
    const sr = createServiceRoleClient();
    await sr.from('waitlist_invites').delete().eq('entry_id', entry!.id);
    await sr.from('waitlist_entries').delete().eq('id', entry!.id);
  });

  it('still captures when signup_mode is waitlist', async () => {
    await setWaitlistMode('waitlist');
    const email = uniqueTestEmail();
    const result = await captureWaitlistEntry(email);
    expect(result.ok).toBe(true);
    const entry = await findWaitlistEntryByEmail(email);
    expect(entry).not.toBeNull();

    const { createServiceRoleClient } = await import('../utils/test-clients');
    const sr = createServiceRoleClient();
    await sr.from('waitlist_invites').delete().eq('entry_id', entry!.id);
    await sr.from('waitlist_entries').delete().eq('id', entry!.id);
    await resetWaitlistModeOpen();
  });

  it('approves entry and validates/consumes invite', async () => {
    const email = uniqueTestEmail();
    await captureWaitlistEntry(email);
    const entry = await findWaitlistEntryByEmail(email);
    expect(entry).not.toBeNull();

    await signInTestUser(adminClient, adminEmail, adminPassword);
    const { data: approveData, error: approveErr } = await adminClient.rpc(
      'admin_approve_waitlist_entry',
      { p_id: entry!.id }
    );
    expect(approveErr).toBeNull();
    const approved = approveData as {
      ok?: boolean;
      invite_token?: string;
    };
    expect(approved.ok).toBe(true);
    expect(approved.invite_token).toBeDefined();

    await anon.auth.signOut();
    const valid = await validateInvite(anon, approved.invite_token!);
    expect(valid.valid).toBe(true);

    const consumerEmail = uniqueTestEmail();
    const consumer = createWebTestClient();
    const created = await createTestUser(consumer, consumerEmail);
    await signInTestUser(consumer, consumerEmail, created.password);

    const consumed = await consumeInvite(
      consumer,
      approved.invite_token!,
      created.userId,
      consumerEmail
    );
    expect(consumed.ok).toBe(true);

    const reused = await validateInvite(anon, approved.invite_token!);
    expect(reused.valid).toBe(false);

    await cleanupTestData(consumer, created.userId, { email: consumerEmail });

    const { createServiceRoleClient } = await import('../utils/test-clients');
    const sr = createServiceRoleClient();
    await sr.from('waitlist_invites').delete().eq('entry_id', entry!.id);
    await sr.from('waitlist_entries').delete().eq('id', entry!.id);
  });

  it('denies waitlist admin list for non-admin', async () => {
    const email = uniqueTestEmail();
    const userClient = createWebTestClient();
    const u = await createTestUser(userClient, email);
    await signInTestUser(userClient, email, u.password);

    const result = await listWaitlistEntries(userClient);
    expect(result).toBeNull();

    await cleanupTestData(userClient, u.userId, { email });
  });
});
