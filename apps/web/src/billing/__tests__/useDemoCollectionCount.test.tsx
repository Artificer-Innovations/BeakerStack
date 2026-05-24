import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDemoCollectionCount } from '@adopter/web/billing/useDemoCollectionCount';

const { rpc, mockClient } = vi.hoisted(() => {
  const rpc = vi.fn();
  const mockClient = { rpc };
  return { rpc, mockClient };
});

vi.mock('../../lib/supabase', () => ({
  supabase: mockClient,
  supabaseRpc: mockClient,
}));

describe('useDemoCollectionCount', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('returns count and maxItemsInAnyCollection from RPC rows', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: '1', item_count: 3 },
        { id: '2', item_count: 8 },
      ],
      error: null,
    });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.maxItemsInAnyCollection).toBe(8);
  });

  it('returns 0 when RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.maxItemsInAnyCollection).toBe(0);
  });

  it('uses 0 max items when collections list is empty', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.maxItemsInAnyCollection).toBe(0);
  });

  it('coerces null data to empty array and item_count null to zero', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: null,
    });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.maxItemsInAnyCollection).toBe(0);
  });

  it('coerces null item_count entries to zero when computing max', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: '1', item_count: null },
        { id: '2', item_count: 4 },
      ],
      error: null,
    });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.maxItemsInAnyCollection).toBe(4);
  });

  it('refresh refetches and updates max items', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ id: 'a', item_count: 2 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'a', item_count: 2 },
          { id: 'b', item_count: 15 },
        ],
        error: null,
      });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.maxItemsInAnyCollection).toBe(2);
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.maxItemsInAnyCollection).toBe(15);
  });
});
