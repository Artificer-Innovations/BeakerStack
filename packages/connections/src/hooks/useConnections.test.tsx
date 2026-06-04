import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConnections } from './useConnections.js';
import {
  createMockSupabase,
  emitConnectionChange,
} from '../test/mockSupabase.js';

const UUID_A = 'c1000000-0000-0000-0000-000000000001';
const row = {
  id: 'c1000000-0000-0000-0000-000000000099',
  status: 'accepted' as const,
  effective_status: 'accepted' as const,
  initiator_user_id: UUID_A,
  recipient_user_id: 'c1000000-0000-0000-0000-000000000002',
  is_initiator: true,
  username: 'alice',
  display_name: 'Alice',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  accepted_at: '2026-01-02T00:00:00.000Z',
};

describe('useConnections', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clears rows when userId is null', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [row],
      error: null,
    }));
    const { result } = renderHook(() =>
      useConnections({ supabase, userId: null })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([]);
  });

  it('loads rows for a signed-in user', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [row],
      error: null,
    }));
    const { result } = renderHook(() =>
      useConnections({ supabase, userId: UUID_A })
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it('passes status filter to connectionsList', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const supabase = createMockSupabase((name, args) => rpc(name, args));
    renderHook(() =>
      useConnections({
        supabase,
        userId: UUID_A,
        status: ['pending'],
      })
    );
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_status: ['pending'] });
  });

  it('sets error when list fails', async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: 'boom' },
    }));
    const { result } = renderHook(() =>
      useConnections({ supabase, userId: UUID_A })
    );
    await waitFor(() => expect(result.current.error?.kind).toBe('unknown'));
    expect(result.current.rows).toEqual([]);
  });

  it('does not refetch when status is a new array with the same values each render', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const supabase = createMockSupabase((name, args) => rpc(name, args));
    const { rerender } = renderHook(
      ({ userId }: { userId: string }) =>
        useConnections({
          supabase,
          userId,
          status: ['pending'],
        }),
      { initialProps: { userId: UUID_A } }
    );
    await waitFor(() => expect(rpc.mock.calls.length).toBeGreaterThan(0));
    const afterMount = rpc.mock.calls.length;
    rerender({ userId: UUID_A });
    rerender({ userId: UUID_A });
    expect(rpc.mock.calls.length).toBe(afterMount);
  });

  it('ignores stale responses when userId changes during fetch', async () => {
    const UUID_B = 'c1000000-0000-0000-0000-000000000002';
    let resolveFirst: (value: {
      data: (typeof row)[];
      error: null;
    }) => void = () => {};
    const firstHang = new Promise<{ data: (typeof row)[]; error: null }>(
      res => {
        resolveFirst = res;
      }
    );
    let calls = 0;
    const supabase = createMockSupabase(() => {
      calls += 1;
      if (calls === 1) return firstHang;
      return Promise.resolve({ data: [], error: null });
    });
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useConnections({ supabase, userId }),
      { initialProps: { userId: UUID_A } }
    );
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    rerender({ userId: UUID_B });
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2));
    resolveFirst({ data: [row], error: null });
    await waitFor(() => expect(result.current.rows).toEqual([]));
  });

  it('ignores stale errors when userId changes during fetch', async () => {
    const UUID_B = 'c1000000-0000-0000-0000-000000000002';
    let resolveFirst: (value: {
      data: null;
      error: { message: string };
    }) => void = () => {};
    const firstHang = new Promise<{ data: null; error: { message: string } }>(
      res => {
        resolveFirst = res;
      }
    );
    let calls = 0;
    const supabase = createMockSupabase(() => {
      calls += 1;
      if (calls === 1) return firstHang;
      return Promise.resolve({ data: [], error: null });
    });
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useConnections({ supabase, userId }),
      { initialProps: { userId: UUID_A } }
    );
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    rerender({ userId: UUID_B });
    await waitFor(() => expect(result.current.loading).toBe(false));
    resolveFirst({ data: null, error: { message: 'stale boom' } });
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('refreshes on realtime postgres_changes after debounce', async () => {
    let calls = 0;
    const supabase = createMockSupabase(async () => {
      calls += 1;
      return { data: calls === 1 ? [row] : [], error: null };
    });
    const { result, unmount } = renderHook(() =>
      useConnections({ supabase, userId: UUID_A })
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    emitConnectionChange(supabase);
    await waitFor(() => expect(result.current.rows).toHaveLength(0), {
      timeout: 3000,
    });
    expect(calls).toBe(2);
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it('skips realtime when enableRealtime is false', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [row],
      error: null,
    }));
    renderHook(() =>
      useConnections({ supabase, userId: UUID_A, enableRealtime: false })
    );
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('uses a per-hook realtime channel name', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [row],
      error: null,
    }));
    renderHook(() => useConnections({ supabase, userId: UUID_A }));
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
    const channelName = vi.mocked(supabase.channel).mock.calls[0]?.[0];
    expect(channelName).toMatch(new RegExp(`^bs_connections:${UUID_A}:[^:]+$`));
  });

  it('uses a timestamp channel suffix when randomUUID is unavailable', async () => {
    vi.stubGlobal('crypto', {});
    const supabase = createMockSupabase(async () => ({
      data: [row],
      error: null,
    }));
    renderHook(() => useConnections({ supabase, userId: UUID_A }));
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
    const channelName = vi.mocked(supabase.channel).mock.calls[0]?.[0];
    expect(channelName).toMatch(new RegExp(`^bs_connections:${UUID_A}:\\d+-`));
    vi.unstubAllGlobals();
  });

  it('does not attach handlers when the channel is already joined', async () => {
    const channel = {
      state: 'joined' as const,
      on: vi.fn(function (this: typeof channel) {
        return this;
      }),
      subscribe: vi.fn(function (this: typeof channel) {
        return this;
      }),
    };
    const supabase = {
      rpc: vi.fn(async () => ({ data: [row], error: null })),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as ReturnType<typeof createMockSupabase>;

    renderHook(() => useConnections({ supabase, userId: UUID_A }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(channel.on).not.toHaveBeenCalled();
    expect(channel.subscribe).not.toHaveBeenCalled();
  });

  it('does not attach handlers when the channel is already joining', async () => {
    const channel = {
      state: 'joining' as const,
      on: vi.fn(function (this: typeof channel) {
        return this;
      }),
      subscribe: vi.fn(function (this: typeof channel) {
        return this;
      }),
    };
    const supabase = {
      rpc: vi.fn(async () => ({ data: [row], error: null })),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as ReturnType<typeof createMockSupabase>;

    renderHook(() => useConnections({ supabase, userId: UUID_A }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(channel.on).not.toHaveBeenCalled();
    expect(channel.subscribe).not.toHaveBeenCalled();
  });

  it('refresh reloads connections', async () => {
    let calls = 0;
    const supabase = createMockSupabase(async () => {
      calls += 1;
      return { data: calls === 1 ? [row] : [], error: null };
    });
    const { result } = renderHook(() =>
      useConnections({ supabase, userId: UUID_A })
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await result.current.refresh();
    await waitFor(() => expect(result.current.rows).toHaveLength(0));
    expect(calls).toBe(2);
  });

  it('ignores debounced reload after unmount', async () => {
    let debouncedCallback: (() => void) | undefined;
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((handler, delay, ...args) => {
        if (typeof handler === 'function' && delay === 400) {
          debouncedCallback = handler as () => void;
        }
        return originalSetTimeout(handler, delay, ...args);
      });
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      let calls = 0;
      const supabase = createMockSupabase(async () => {
        calls += 1;
        return { data: [row], error: null };
      });
      const { unmount } = renderHook(() =>
        useConnections({ supabase, userId: UUID_A })
      );
      await waitFor(() => expect(calls).toBe(1));
      emitConnectionChange(supabase);
      expect(debouncedCallback).toBeDefined();
      unmount();
      debouncedCallback?.();
      await Promise.resolve();
      expect(calls).toBe(1);
      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    }
  });
});
