import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useBillingStripeActions } from './useBillingStripeActions.js';

const { invoke, mockSupabase, refreshSubscription } = vi.hoisted(() => {
  const invoke = vi.fn();
  const refreshSubscription = vi.fn().mockResolvedValue(undefined);
  const mockSupabase = {
    functions: { invoke },
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { invoke, mockSupabase, refreshSubscription };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    supabase: mockSupabase,
    config: testBillingConfig,
    stripeFunctionName: 'billing-stripe',
    refreshSubscription,
  }),
}));

describe('useBillingStripeActions', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('updateSubscription calls edge function', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useBillingStripeActions());
    const ok = await result.current.updateSubscription('plan_x', 'annual');
    expect(ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({
          action: 'update_subscription',
          planId: 'plan_x',
          cadence: 'annual',
        }),
      })
    );
  });

  it('scheduleCancelToFree posts downgrade action', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useBillingStripeActions());
    const ok = await result.current.scheduleCancelToFree();
    expect(ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'schedule_cancel_to_free' }),
      })
    );
  });

  it('reactivateSubscription posts resume action', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useBillingStripeActions());
    const ok = await result.current.reactivateSubscription();
    expect(ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'resume_subscription' }),
      })
    );
  });

  it('cancelSubscriptionImmediately posts cancel_immediately', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useBillingStripeActions());
    const ok = await result.current.cancelSubscriptionImmediately();
    expect(ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'cancel_immediately' }),
      })
    );
  });

  it('returns false on invoke error', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('bad') });
    const { result } = renderHook(() => useBillingStripeActions());
    const ok = await result.current.updateSubscription('p');
    expect(ok).toBe(false);
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
