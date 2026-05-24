import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDemoCollections } from '../useDemoCollections';
import { supabase } from '@mobile/lib/supabase';

type RpcResult = { data: unknown; error: { message: string } | null };

jest.mock('@mobile/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const mockRpc = supabase.rpc as unknown as jest.MockedFunction<
  (name: string, args?: Record<string, unknown>) => Promise<RpcResult>
>;

describe('useDemoCollections', () => {
  beforeEach(() => {
    mockRpc.mockReset();
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

  it('sets error message when RPC returns error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'rpc failed' },
    });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Could not load demo collections.');
    expect(result.current.collections).toEqual([]);
  });

  it('refresh reloads collections after initial load', async () => {
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
  });

  it('surfaces Error message when fetch fails with Error', async () => {
    mockRpc.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('network');
  });

  it('coerces null RPC data to empty array', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useDemoCollections());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.collections).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
