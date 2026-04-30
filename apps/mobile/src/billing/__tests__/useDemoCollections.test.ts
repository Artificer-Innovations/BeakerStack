import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDemoCollections } from '../useDemoCollections';

type RpcReturn = { data: unknown; error: unknown };

const mockRpc = jest.fn<(...args: unknown[]) => Promise<RpcReturn>>();

jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe('useDemoCollections', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('treats null data as empty collections when no error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.collections).toEqual([]);
  });

  it('maps RPC rows and clears error on success', async () => {
    mockRpc.mockResolvedValue({
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
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Could not load demo collections.');
    expect(result.current.collections).toEqual([]);
  });

  it('uses Error message when throw is Error', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('network down');
    expect(result.current.collections).toEqual([]);
  });

  it('sets generic error when throw is non-Error', async () => {
    mockRpc.mockRejectedValue('boom');
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Could not load demo collections.');
    expect(result.current.collections).toEqual([]);
  });

  it('refresh refetches after initial load', async () => {
    mockRpc
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
      await result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.collections).toHaveLength(2);
  });

  it('addCollection calls RPC then refetches', async () => {
    mockRpc
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
    expect(mockRpc).toHaveBeenCalledWith(
      'billing_demo_add_collection',
      expect.objectContaining({ p_product_id: 'beakerstack' })
    );
  });

  it('deleteCollection calls RPC then refetches', async () => {
    mockRpc
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
    expect(mockRpc).toHaveBeenCalledWith(
      'billing_demo_delete_collection',
      expect.objectContaining({
        p_product_id: 'beakerstack',
        p_collection_id: 'x',
      })
    );
  });

  it('addItem calls RPC then refetches', async () => {
    mockRpc
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
    expect(mockRpc).toHaveBeenCalledWith(
      'billing_demo_add_item',
      expect.objectContaining({
        p_product_id: 'beakerstack',
        p_collection_id: 'col',
      })
    );
  });

  it('propagates RPC error from addCollection', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockRpc.mockResolvedValueOnce({
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

  it('propagates RPC error from deleteCollection', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'x', item_count: 1 }],
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
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
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'col', item_count: 0 }],
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'item denied' },
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await expect(result.current.addItem('col')).rejects.toEqual({
      message: 'item denied',
    });
  });
});
