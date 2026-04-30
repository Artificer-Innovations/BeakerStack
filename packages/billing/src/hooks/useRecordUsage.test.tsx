import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useRecordUsage } from './useRecordUsage.js';

const { rpc, mockSupabase, refreshMeter } = vi.hoisted(() => {
  const rpc = vi.fn();
  const refreshMeter = vi.fn().mockResolvedValue(undefined);
  const mockSupabase = {
    rpc,
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { rpc, mockSupabase, refreshMeter };
});

vi.mock('./useUsage.js', () => ({
  useUsage: () => ({ refresh: refreshMeter }),
}));

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    supabase: mockSupabase,
    config: testBillingConfig,
  }),
}));

describe('useRecordUsage', () => {
  beforeEach(() => {
    rpc.mockReset();
    refreshMeter.mockClear();
  });

  it('records usage and refreshes meter', async () => {
    rpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useRecordUsage('ai'));
    await result.current.record(2);
    await waitFor(() => expect(result.current.lastRecordedAt).not.toBeNull());
    expect(refreshMeter).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      'billing_record_usage_event',
      expect.objectContaining({
        p_event_type: 'ai',
        p_quantity: 2,
        p_metadata: {},
      })
    );
  });

  it('passes metadata to RPC', async () => {
    rpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useRecordUsage('ai'));
    await result.current.record(1, { source: 'test' });
    await waitFor(() => expect(result.current.lastRecordedAt).not.toBeNull());
    expect(rpc).toHaveBeenCalledWith(
      'billing_record_usage_event',
      expect.objectContaining({
        p_metadata: { source: 'test' },
      })
    );
  });

  it('maps RPC errors', async () => {
    rpc.mockResolvedValue({ error: { message: 'rpc fail' } });
    const { result } = renderHook(() => useRecordUsage('ai'));
    await result.current.record();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(refreshMeter).toHaveBeenCalled();
  });
});
