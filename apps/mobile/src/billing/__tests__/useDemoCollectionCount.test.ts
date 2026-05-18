import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDemoCollectionCount } from '../useDemoCollectionCount';

type RpcReturn = { data: unknown; error: unknown };
const mockRpc = jest.fn<(...args: unknown[]) => Promise<RpcReturn>>();

jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe('useDemoCollectionCount', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('starts with loading=true before data arrives', () => {
    // Never resolves → loading stays true
    mockRpc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDemoCollectionCount());
    expect(result.current.loading).toBe(true);
    expect(result.current.count).toBe(0);
  });

  it('sets count and maxItemsInAnyCollection from data rows', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'a', item_count: 5 }, { id: 'b', item_count: 3 }],
      error: null,
    });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(2);
    expect(result.current.maxItemsInAnyCollection).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('treats null data as empty (count=0, maxItems=0)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(0);
    expect(result.current.maxItemsInAnyCollection).toBe(0);
  });

  it('wraps non-Error rpcError in Error("Failed to load collections")', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db error' } });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to load collections');
    expect(result.current.count).toBe(0);
  });

  it('preserves Error message for thrown Error instances', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('network down');
  });

  it('sets maxItemsInAnyCollection=0 when all item_counts are null', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'a', item_count: null }, { id: 'b', item_count: null }],
      error: null,
    });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.maxItemsInAnyCollection).toBe(0);
  });

  it('refresh re-fetches and updates count', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [{ id: 'a', item_count: 1 }], error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'a', item_count: 1 }, { id: 'b', item_count: 2 }],
        error: null,
      });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(1);
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(2);
  });
});
