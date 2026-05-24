import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDemoCollectionCount } from '../useDemoCollectionCount';
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

describe('useDemoCollectionCount', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns count and maxItemsInAnyCollection from RPC rows', async () => {
    mockRpc.mockResolvedValue({
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
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const { result } = renderHook(() => useDemoCollectionCount());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.maxItemsInAnyCollection).toBe(0);
    expect(result.current.error).toBe('[object Object]');
  });

  it('refresh refetches and updates max items', async () => {
    mockRpc
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
