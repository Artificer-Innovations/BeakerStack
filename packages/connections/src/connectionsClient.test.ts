import { describe, expect, it, vi } from 'vitest';
import {
  connectionsAccept,
  connectionsBlock,
  connectionsDecline,
  connectionsDisconnect,
  connectionsGetStatus,
  connectionsList,
  connectionsRequest,
  connectionsSearchUsers,
  connectionsUnblock,
} from './connectionsClient.js';
import { createMockSupabase } from './test/mockSupabase.js';

const UUID_B = 'c1000000-0000-0000-0000-000000000002';
const CONN_ID = 'c1000000-0000-0000-0000-000000000099';

describe('connectionsClient', () => {
  it('connectionsRequest returns first row or null', async () => {
    const supabase = createMockSupabase(async name => {
      expect(name).toBe('connections_request');
      return { data: [{ id: CONN_ID }], error: null };
    });
    await expect(connectionsRequest(supabase, UUID_B)).resolves.toEqual({
      id: CONN_ID,
    });

    const empty = createMockSupabase(async () => ({ data: [], error: null }));
    await expect(connectionsRequest(empty, UUID_B)).resolves.toBeNull();
  });

  it('connectionsAccept returns first row or null', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [{ id: CONN_ID, status: 'accepted' }],
      error: null,
    }));
    await expect(connectionsAccept(supabase, CONN_ID)).resolves.toMatchObject({
      status: 'accepted',
    });

    const empty = createMockSupabase(async () => ({ data: [], error: null }));
    await expect(connectionsAccept(empty, CONN_ID)).resolves.toBeNull();
  });

  it('connectionsDecline and connectionsDisconnect complete without data', async () => {
    const supabase = createMockSupabase(async name => {
      expect(['connections_decline', 'connections_disconnect']).toContain(name);
      return { data: null, error: null };
    });
    await connectionsDecline(supabase, CONN_ID);
    await connectionsDisconnect(supabase, CONN_ID);
  });

  it('connectionsBlock and connectionsUnblock', async () => {
    const supabase = createMockSupabase(async name => {
      if (name === 'connections_block') {
        return { data: [{ id: CONN_ID }], error: null };
      }
      return { data: null, error: null };
    });
    await expect(connectionsBlock(supabase, UUID_B)).resolves.toEqual({
      id: CONN_ID,
    });
    await connectionsUnblock(supabase, UUID_B);
  });

  it('connectionsList applies filters and defaults', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const supabase = createMockSupabase((name, args) => rpc(name, args));

    await connectionsList(supabase);
    expect(rpc).toHaveBeenCalledWith('connections_list', {
      p_status: null,
      p_limit: 25,
      p_offset: 0,
    });

    await connectionsList(supabase, {
      status: ['pending'],
      limit: 10,
      offset: 5,
    });
    expect(rpc).toHaveBeenLastCalledWith('connections_list', {
      p_status: ['pending'],
      p_limit: 10,
      p_offset: 5,
    });
  });

  it('connectionsGetStatus returns row or none default', async () => {
    const withRow = createMockSupabase(async () => ({
      data: [
        {
          status: 'pending',
          effective_status: 'pending',
          is_initiator: true,
          connection_id: CONN_ID,
        },
      ],
      error: null,
    }));
    await expect(connectionsGetStatus(withRow, UUID_B)).resolves.toMatchObject({
      connection_id: CONN_ID,
    });

    const empty = createMockSupabase(async () => ({ data: [], error: null }));
    await expect(connectionsGetStatus(empty, UUID_B)).resolves.toEqual({
      status: 'none',
      effective_status: 'none',
      is_initiator: false,
      connection_id: null,
    });
  });

  it('connectionsSearchUsers returns rows with default limit', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          user_id: UUID_B,
          username: 'bob',
          display_name: null,
          avatar_url: null,
        },
      ],
      error: null,
    }));
    const supabase = createMockSupabase((name, args) => rpc(name, args));
    const rows = await connectionsSearchUsers(supabase, 'bob');
    expect(rows).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('connections_search_users', {
      p_query: 'bob',
      p_limit: 20,
    });
    await connectionsSearchUsers(supabase, 'bob', 5);
    expect(rpc).toHaveBeenLastCalledWith('connections_search_users', {
      p_query: 'bob',
      p_limit: 5,
    });
  });

  it('handles null and undefined rpc data payloads', async () => {
    const empty = createMockSupabase(async () => ({
      data: undefined,
      error: null,
    }));
    await expect(connectionsList(empty)).resolves.toEqual([]);
    await expect(connectionsRequest(empty, UUID_B)).resolves.toBeNull();
    await expect(connectionsSearchUsers(empty, 'x')).resolves.toEqual([]);
    await expect(connectionsBlock(empty, UUID_B)).resolves.toBeNull();

    const nullData = createMockSupabase(async () => ({
      data: null,
      error: null,
    }));
    await expect(connectionsGetStatus(nullData, UUID_B)).resolves.toEqual({
      status: 'none',
      effective_status: 'none',
      is_initiator: false,
      connection_id: null,
    });
  });

  it('connectionsList supports partial options', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const supabase = createMockSupabase((name, args) => rpc(name, args));
    await connectionsList(supabase, { limit: 5 });
    expect(rpc).toHaveBeenCalledWith('connections_list', {
      p_status: null,
      p_limit: 5,
      p_offset: 0,
    });
    await connectionsList(supabase, { offset: 3 });
    expect(rpc).toHaveBeenLastCalledWith('connections_list', {
      p_status: null,
      p_limit: 25,
      p_offset: 3,
    });
  });

  it('throws mapped errors for decline, disconnect, and unblock', async () => {
    const supabase = createMockSupabase(async name => ({
      data: null,
      error: { message: `${name} failed` },
    }));
    await expect(connectionsDecline(supabase, CONN_ID)).rejects.toMatchObject({
      kind: 'unknown',
    });
    await expect(
      connectionsDisconnect(supabase, CONN_ID)
    ).rejects.toMatchObject({
      kind: 'unknown',
    });
    await expect(connectionsUnblock(supabase, UUID_B)).rejects.toMatchObject({
      kind: 'unknown',
    });
  });

  it('throws mapped errors when rpc fails', async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: 'JWT invalid' },
    }));
    await expect(connectionsRequest(supabase, UUID_B)).rejects.toMatchObject({
      kind: 'unauthenticated',
    });
    await expect(connectionsAccept(supabase, CONN_ID)).rejects.toMatchObject({
      kind: 'unauthenticated',
    });
    await expect(connectionsBlock(supabase, UUID_B)).rejects.toMatchObject({
      kind: 'unauthenticated',
    });
  });
});
