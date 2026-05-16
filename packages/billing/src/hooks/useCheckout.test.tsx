import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useCheckout } from './useCheckout.js';

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
    checkoutSuccessUrl: 'https://ok',
    checkoutCancelUrl: 'https://cancel',
    stripeFunctionName: 'billing-stripe',
    refreshSubscription,
  }),
}));

describe('useCheckout', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('returns checkoutUrl on success', async () => {
    invoke.mockResolvedValue({
      data: { checkoutUrl: 'https://stripe.test/session' },
      error: null,
    });
    const { result } = renderHook(() => useCheckout());
    const r = await result.current.startCheckout('plan_free', 'monthly');
    expect(r?.checkoutUrl).toBe('https://stripe.test/session');
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({
          action: 'checkout',
          planId: 'plan_free',
          cadence: 'monthly',
        }),
      })
    );
  });

  it('returns null when checkoutUrl missing', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useCheckout());
    const r = await result.current.startCheckout('plan_free');
    expect(r).toBeNull();
    await waitFor(() => expect(result.current.error?.kind).toBe('stripe'));
  });

  it('maps invoke errors', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('fn fail') });
    const { result } = renderHook(() => useCheckout());
    const r = await result.current.startCheckout('plan_free');
    expect(r).toBeNull();
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('surfaces structured error body from failed invoke', async () => {
    invoke.mockResolvedValue({
      data: {
        error: 'invalid_redirect_url',
        hint: 'Add origin to BILLING_ALLOWED_ORIGINS',
      },
      error: new Error('FunctionsHttpError'),
    });
    const { result } = renderHook(() => useCheckout());
    const r = await result.current.startCheckout('plan_free');
    expect(r).toBeNull();
    await waitFor(() =>
      expect(result.current.error?.message).toContain('invalid_redirect_url')
    );
  });

  it('includes trialDays in invoke body when provided', async () => {
    invoke.mockResolvedValue({
      data: { checkoutUrl: 'https://stripe.test/session' },
      error: null,
    });
    const { result } = renderHook(() => useCheckout());
    await result.current.startCheckout('plan_free', 'annual', 14);
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({ trialDays: 14, cadence: 'annual' }),
      })
    );
  });
});
