import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useUsage } from './useUsage.js';

const { rpc, mockSupabase, usageRealtimeCb } = vi.hoisted(() => {
  const rpc = vi.fn();
  const usageRealtimeCb = { current: undefined as ((p: unknown) => void) | undefined };
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
  const mockSupabase = { rpc, channel, removeChannel } as unknown as
    ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { rpc, mockSupabase, usageRealtimeCb };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    subscriptionLoading: false,
    supabase: mockSupabase,
    config: testBillingConfig,
  }),
}));

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
    usageRealtimeCb.current?.({ new: { product_id: 'other_product', event_type: 'ai' }, old: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not refetch when realtime event_type does not match meter key', async () => {
    rpc.mockResolvedValue({
      data: { used: 1, limit: 5, remaining: 4, periodEnd: '', periodStart: '' },
      error: null,
    });
    renderHook(() => useUsage('ai'));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    rpc.mockClear();
    usageRealtimeCb.current?.({ new: { product_id: 'test_product', event_type: 'storage' }, old: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(rpc).not.toHaveBeenCalled();
  });
});
