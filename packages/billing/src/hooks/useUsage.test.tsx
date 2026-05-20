import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useUsage } from './useUsage.js';

const { rpc, mockSupabase, usageRealtimeCb, removeChannel } = vi.hoisted(() => {
  const rpc = vi.fn();
  const usageRealtimeCb = {
    current: undefined as ((p: unknown) => void) | undefined,
  };
  const removeChannel = vi.fn();
  const channel = vi.fn(() => {
    const chain = {
      on: vi.fn((type: string, _cfg: unknown, cb: (p: unknown) => void) => {
        if (type === 'postgres_changes') usageRealtimeCb.current = cb;
        return chain;
      }),
      subscribe: vi.fn(),
    };
    return chain;
  });
  const mockSupabase = {
    rpc,
    channel,
    removeChannel,
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { rpc, mockSupabase, usageRealtimeCb, removeChannel };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    subscriptionLoading: false,
    supabase: mockSupabase,
    config: testBillingConfig,
  }),
}));

describe('useUsage', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('parses RPC payload', async () => {
    rpc.mockResolvedValue({
      data: {
        used: 3,
        limit: 10,
        remaining: 7,
        periodEnd: '2025-12-31',
        periodStart: '2025-12-01',
      },
      error: null,
    });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.used).toBe(3);
    expect(result.current.limit).toBe(10);
    expect(result.current.remaining).toBe(7);
    expect(result.current.exceeded).toBe(false);
  });

  it('treats unauthenticated RPC payload as error', async () => {
    rpc.mockResolvedValue({ data: { error: 'unauthenticated' }, error: null });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() =>
      expect(result.current.error?.kind).toBe('unauthenticated')
    );
    expect(result.current.used).toBe(0);
  });

  it('sets exceeded when used >= limit', async () => {
    rpc.mockResolvedValue({
      data: {
        used: 10,
        limit: 10,
        remaining: 0,
        periodEnd: '',
        periodStart: '',
      },
      error: null,
    });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.exceeded).toBe(true));
  });

  it('refetches when billing_usage_aggregates realtime matches product and meter', async () => {
    rpc.mockResolvedValue({
      data: {
        used: 0,
        limit: 5,
        remaining: 5,
        periodEnd: '2026-01-01',
        periodStart: '2025-12-01',
      },
      error: null,
    });
    const { result, unmount } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSupabase.channel).toHaveBeenCalled();
    rpc.mockClear();
    usageRealtimeCb.current?.({
      new: { product_id: 'test_product', event_type: 'ai' },
      old: null,
    });
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(result.current.used).toBe(0);
    unmount();
    expect(removeChannel).toHaveBeenCalled();
  });
});

describe('useUsage (coverage)', () => {
  beforeEach(() => {
    rpc.mockReset();
    usageRealtimeCb.current = undefined;
  });

  it('sets error when RPC returns an error object', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('rpc failure') });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.used).toBe(0);
  });

  it('does not refetch when realtime product_id does not match', async () => {
    rpc.mockResolvedValue({
      data: { used: 1, limit: 5, remaining: 4, periodEnd: '', periodStart: '' },
      error: null,
    });
    renderHook(() => useUsage('ai'));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    rpc.mockClear();
    usageRealtimeCb.current?.({
      new: { product_id: 'other_product', event_type: 'ai' },
      old: null,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('parses explicit null limit and remaining from RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        used: 1,
        limit: null,
        remaining: null,
        periodEnd: '2026-01-01',
        periodStart: '2025-12-01',
      },
      error: null,
    });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.limit).toBeNull();
    expect(result.current.remaining).toBeNull();
  });

  it('refresh triggers a second RPC fetch', async () => {
    rpc.mockResolvedValue({
      data: {
        used: 1,
        limit: 5,
        remaining: 4,
        periodEnd: '',
        periodStart: '',
      },
      error: null,
    });
    const { result } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    rpc.mockClear();
    await result.current.refresh();
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
  });

  it('skips re-attaching handlers when channel is already joined', async () => {
    rpc.mockResolvedValue({
      data: { used: 1, limit: 5, remaining: 4, periodEnd: '', periodStart: '' },
      error: null,
    });
    const joinedChannel = {
      state: 'joined' as const,
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    vi.mocked(mockSupabase.channel).mockReturnValueOnce(joinedChannel as never);
    const { unmount } = renderHook(() => useUsage('ai'));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(joinedChannel.on).not.toHaveBeenCalled();
    unmount();
    expect(removeChannel).toHaveBeenCalled();
  });

  it('does not refetch when realtime event_type does not match meter key', async () => {
    rpc.mockResolvedValue({
      data: { used: 1, limit: 5, remaining: 4, periodEnd: '', periodStart: '' },
      error: null,
    });
    renderHook(() => useUsage('ai'));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    rpc.mockClear();
    usageRealtimeCb.current?.({
      new: { product_id: 'test_product', event_type: 'storage' },
      old: null,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(rpc).not.toHaveBeenCalled();
  });
});
