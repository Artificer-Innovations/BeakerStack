import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIsAdmin } from './useIsAdmin.js';

function createSupabase(isAdmin: boolean) {
  return {
    rpc: vi.fn(async (name: string) => {
      if (name === 'admin_is_admin') {
        return { data: isAdmin, error: null };
      }
      return { data: null, error: null };
    }),
  } as never;
}

describe('useIsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when supabase or userId is missing', async () => {
    const { result } = renderHook(() => useIsAdmin(null, undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('sets isAdmin true when RPC returns true', async () => {
    const sb = createSupabase(true);
    const { result } = renderHook(() => useIsAdmin(sb, 'user-1'));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isAdmin false when RPC returns false', async () => {
    const sb = createSupabase(false);
    const { result } = renderHook(() => useIsAdmin(sb, 'user-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('sets error when RPC throws', async () => {
    const sb = {
      rpc: vi.fn(async () => {
        throw new Error('rpc down');
      }),
    } as never;
    const { result } = renderHook(() => useIsAdmin(sb, 'user-1'));
    await waitFor(() => expect(result.current.error?.message).toBe('rpc down'));
    expect(result.current.isAdmin).toBe(false);
  });

  it('sets error for non-Error throws', async () => {
    const sb = {
      rpc: vi.fn(async () => {
        throw 'offline';
      }),
    } as never;
    const { result } = renderHook(() => useIsAdmin(sb, 'user-1'));
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
  });

  it('stays loading when userId appears so guards do not false-negative', async () => {
    const sb = createSupabase(true);
    let resolveRpc: (value: { data: boolean; error: null }) => void;
    vi.mocked(sb.rpc).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRpc = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | undefined }) => useIsAdmin(sb, uid),
      { initialProps: { uid: undefined as string | undefined } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ uid: 'user-1' });
    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(false);

    resolveRpc!({ data: true, error: null });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  it('refresh re-runs admin check', async () => {
    const sb = createSupabase(false);
    const { result } = renderHook(() => useIsAdmin(sb, 'user-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(sb.rpc).mockImplementation(async (name: string) => {
      if (name === 'admin_is_admin') {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    });
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.isAdmin).toBe(true);
    expect(sb.rpc).toHaveBeenCalledTimes(2);
  });
});
