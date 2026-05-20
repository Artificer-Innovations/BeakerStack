/**
 * Admin RPC access control and audit logging.
 */

import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
} from '../utils/test-helpers';
import {
  grantTestAdmin,
  revokeTestAdmin,
  uniqueTestEmail,
} from '../utils/integration-fixtures';
import {
  checkIsAdmin,
  listUsers,
  recordAuditEvent,
} from '../../packages/admin/src/adminClient';

describe('Admin access integration', () => {
  const client = createWebTestClient();
  let userId: string;
  let email: string;
  let password: string;

  beforeAll(async () => {
    email = uniqueTestEmail();
    const u = await createTestUser(client, email);
    userId = u.userId;
    password = u.password;
  });

  afterAll(async () => {
    await revokeTestAdmin(userId);
    await cleanupTestData(client, userId, { email });
  });

  it('reports non-admin before grant', async () => {
    await signInTestUser(client, email, password);
    const isAdmin = await checkIsAdmin(client);
    expect(isAdmin).toBe(false);

    const denied = await listUsers(client);
    expect(denied).toBeNull();
  });

  it('allows admin RPCs after grant', async () => {
    await grantTestAdmin(userId);
    await signInTestUser(client, email, password);

    const isAdmin = await checkIsAdmin(client);
    expect(isAdmin).toBe(true);

    const list = await listUsers(client, { limit: 5 });
    expect(list).not.toBeNull();
    expect(Array.isArray(list?.users)).toBe(true);
  });

  it('records an audit event', async () => {
    await signInTestUser(client, email, password);
    await recordAuditEvent(client, {
      action: 'integration.test',
      details: { suite: 'admin-access' },
    });

    const { createServiceRoleClient } = await import('../utils/test-clients');
    const sr = createServiceRoleClient();
    const { data, error } = await sr
      .from('admin_audit_log')
      .select('action, actor_user_id')
      .eq('actor_user_id', userId)
      .eq('action', 'integration.test')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.action).toBe('integration.test');
  });

  it('denies admin RPCs after revoke', async () => {
    await revokeTestAdmin(userId);
    await signInTestUser(client, email, password);

    const isAdmin = await checkIsAdmin(client);
    expect(isAdmin).toBe(false);

    const denied = await listUsers(client);
    expect(denied).toBeNull();
  });
});
