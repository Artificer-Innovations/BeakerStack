import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDemoCollections } from '@adopter/web/billing/useDemoCollections';
import { appIdentity } from '@adopter/config/app-identity';

const { rpc, mockClient } = vi.hoisted(() => {
  const rpc = vi.fn();
  const mockClient = { rpc };
  return { rpc, mockClient };
});

vi.mock('@/lib/supabase', () => ({
  supabaseRpc: mockClient,
}));

describe('useDemoCollections', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('maps RPC rows and clears error on success', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: 'c1', item_count: 2 },
        { id: 99, item_count: null },
      ],
      error: null,
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.collections).toEqual([
      { id: 'c1', item_count: 2 },
      { id: '99', item_count: 0 },
    ]);
  });

  it('sets error and empty collections when RPC returns error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('[object Object]');
    expect(result.current.collections).toEqual([]);
  });

  it('sets stringified error when throw is non-Error', async () => {
    rpc.mockRejectedValue('boom');
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('boom');
    expect(result.current.collections).toEqual([]);
  });

  it('surfaces Error message when fetch fails with Error', async () => {
    rpc.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('network');
    expect(result.current.collections).toEqual([]);
  });

  it('refetch reloads collections after initial load', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ id: 'a', item_count: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'a', item_count: 1 },
          { id: 'b', item_count: 5 },
        ],
        error: null,
      });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.collections).toHaveLength(1);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.collections).toHaveLength(2);
  });

  it('addCollection calls RPC then refetches', async () => {
    rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'new', item_count: 0 }],
        error: null,
      });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await act(async () => {
      await result.current.addCollection();
    });
    await waitFor(() => {
      expect(result.current.collections.some(c => c.id === 'new')).toBe(true);
    });
    expect(rpc).toHaveBeenCalledWith(
      'billing_demo_add_collection',
      expect.objectContaining({ p_product_id: appIdentity.productId })
    );
  });

  it('deleteCollection calls RPC then refetches', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ id: 'x', item_count: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await act(async () => {
      await result.current.deleteCollection('x');
    });
    await waitFor(() => {
      expect(result.current.collections).toEqual([]);
    });
    expect(rpc).toHaveBeenCalledWith(
      'billing_demo_delete_collection',
      expect.objectContaining({
        p_product_id: appIdentity.productId,
        p_collection_id: 'x',
      })
    );
  });

  it('addItem calls RPC then refetches', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ id: 'col', item_count: 0 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'col', item_count: 1 }],
        error: null,
      });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await act(async () => {
      await result.current.addItem('col');
    });
    await waitFor(() => {
      expect(result.current.collections[0]?.item_count).toBe(1);
    });
    expect(rpc).toHaveBeenCalledWith(
      'billing_demo_add_item',
      expect.objectContaining({
        p_product_id: appIdentity.productId,
        p_collection_id: 'col',
      })
    );
  });

  it('coerces null RPC data to empty array', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.collections).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('propagates RPC error from deleteCollection', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'delete denied' },
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await expect(result.current.deleteCollection('x')).rejects.toEqual({
      message: 'delete denied',
    });
  });

  it('propagates RPC error from addItem', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'add item denied' },
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await expect(result.current.addItem('col')).rejects.toEqual({
      message: 'add item denied',
    });
  });

  it('propagates RPC error from addCollection', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'add denied' },
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await expect(result.current.addCollection()).rejects.toEqual({
      message: 'add denied',
    });
  });
});
