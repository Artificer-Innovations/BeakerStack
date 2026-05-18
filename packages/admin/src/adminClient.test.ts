import { describe, expect, it, vi } from 'vitest';
import {
  checkIsAdmin,
  getUser,
  listUsers,
  recordAuditEvent,
} from './adminClient.js';

function mockSupabase(
  rpcImpl: (name: string, args?: Record<string, unknown>) => unknown,
  options?: { error?: { message: string } | null }
) {
  return {
    rpc: vi.fn((name: string, args?: Record<string, unknown>) => {
      if (options?.error) {
        return Promise.resolve({ data: null, error: options.error });
      }
      const data = rpcImpl(name, args);
      return Promise.resolve({ data, error: null });
    }),
  } as never;
}

describe('adminClient', () => {
  it('checkIsAdmin returns false on RPC false', async () => {
    const sb = mockSupabase(name => (name === 'admin_is_admin' ? false : null));
    await expect(checkIsAdmin(sb)).resolves.toBe(false);
  });

  it('checkIsAdmin returns true when RPC true', async () => {
    const sb = mockSupabase(name => (name === 'admin_is_admin' ? true : null));
    await expect(checkIsAdmin(sb)).resolves.toBe(true);
  });

  it('checkIsAdmin throws when RPC errors', async () => {
    const sb = mockSupabase(() => null, { error: { message: 'fail' } });
    await expect(checkIsAdmin(sb)).rejects.toThrow('fail');
  });

  it('listUsers returns null on not_found', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_list_users' ? { error: 'not_found' } : null
    );
    await expect(listUsers(sb)).resolves.toBeNull();
  });

  it('listUsers uses defaults when response omits pagination fields', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_list_users' ? { users: [], total: 2 } : null
    );
    const result = await listUsers(sb, { limit: 10, offset: 5 });
    expect(result?.limit).toBe(10);
    expect(result?.offset).toBe(5);
    expect(result?.total).toBe(2);
  });

  it('listUsers parses users payload', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_list_users'
        ? {
            users: [
              {
                user_id: 'u1',
                email: 'a@b.com',
                usage_current_period: { ai_summarize: 3 },
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          }
        : null
    );
    const result = await listUsers(sb);
    expect(result?.total).toBe(1);
    expect(result?.users[0]?.email).toBe('a@b.com');
  });

  it('listUsers throws on unexpected payload shape', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_list_users' ? 'not-an-object' : null
    );
    await expect(listUsers(sb)).rejects.toThrow('unexpected payload');
  });

  it('listUsers throws when pagination fields are not numeric', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_list_users' ? { users: [], total: 'nope' } : null
    );
    await expect(listUsers(sb)).rejects.toThrow('invalid pagination');
  });

  it('listUsers throws when RPC errors', async () => {
    const sb = mockSupabase(() => null, { error: { message: 'denied' } });
    await expect(listUsers(sb)).rejects.toThrow('denied');
  });

  it('getUser returns null on not_found', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_get_user' ? { error: 'not_found' } : null
    );
    await expect(getUser(sb, 'uuid')).resolves.toBeNull();
  });

  it('getUser uses default product id', async () => {
    const detail = { auth: { id: 'u1' } };
    const sb = mockSupabase(name =>
      name === 'admin_get_user' ? detail : null
    );
    await getUser(sb, 'u1');
    expect(sb.rpc).toHaveBeenCalledWith('admin_get_user', {
      p_user_id: 'u1',
      p_product_id: 'beakerstack',
    });
  });

  it('getUser returns detail payload', async () => {
    const detail = { auth: { id: 'u1', email: 'a@b.com' } };
    const sb = mockSupabase(name =>
      name === 'admin_get_user' ? detail : null
    );
    await expect(getUser(sb, 'u1', 'my_product')).resolves.toEqual(detail);
    expect(sb.rpc).toHaveBeenCalledWith('admin_get_user', {
      p_user_id: 'u1',
      p_product_id: 'my_product',
    });
  });

  it('recordAuditEvent calls RPC with target and details', async () => {
    const sb = mockSupabase(name =>
      name === 'admin_record_audit_event' ? null : null
    );
    await recordAuditEvent(sb, {
      action: 'custom.action',
      target: { type: 'user', id: 'u1' },
      details: { foo: 'bar' },
    });
    expect(sb.rpc).toHaveBeenCalledWith('admin_record_audit_event', {
      p_action: 'custom.action',
      p_target_type: 'user',
      p_target_id: 'u1',
      p_details: { foo: 'bar' },
    });
  });

  it('recordAuditEvent throws when RPC errors', async () => {
    const sb = mockSupabase(() => null, { error: { message: 'audit fail' } });
    await expect(recordAuditEvent(sb, { action: 'x' })).rejects.toThrow(
      'audit fail'
    );
  });
});
