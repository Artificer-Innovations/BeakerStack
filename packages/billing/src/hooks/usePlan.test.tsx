import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SubscriptionRow } from '../types.js';
import { baseBillingContextExtras, testPlan } from '../test/billingFixtures.js';
import { usePlan } from './usePlan.js';

const hp = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  };
  const subscription: SubscriptionRow = {
    id: 'sub_1',
    user_id: 'user_1',
    product_id: 'test_product',
    plan_id: 'plan_free',
    stripe_customer_id: null,
    stripe_subscription_id: 'sub_x',
    stripe_price_id: 'price_monthly',
    status: 'active',
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    pending_target_plan_id: null,
    canceled_at: null,
    trial_start: null,
    trial_end: null,
  };
  return { maybeSingle, supabase, subscription, subscriptionLoading: false };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    supabase:
      hp.supabase as unknown as import('@supabase/supabase-js').SupabaseClient,
    subscription: hp.subscription,
    subscriptionLoading: hp.subscriptionLoading,
  }),
}));

describe('usePlan', () => {
  beforeEach(() => {
    hp.maybeSingle.mockReset();
    hp.subscriptionLoading = false;
    hp.subscription = {
      ...hp.subscription,
      plan_id: 'plan_free',
    };
  });

  it('stays idle while subscription is loading', () => {
    hp.subscriptionLoading = true;
    const { result } = renderHook(() => usePlan());
    expect(result.current.loading).toBe(true);
    expect(hp.supabase.from).not.toHaveBeenCalled();
  });

  it('clears plan when subscription has no plan_id', async () => {
    hp.subscription = { ...hp.subscription, plan_id: '' };
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(hp.supabase.from).not.toHaveBeenCalled();
  });

  it('loads plan from billing_plans', async () => {
    const row = { ...testPlan(), features: {} };
    hp.maybeSingle.mockResolvedValue({ data: row, error: null });
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current.data?.id).toBe('plan_free'));
    expect(hp.supabase.from).toHaveBeenCalledWith('billing_plans');
    expect(result.current.error).toBeNull();
  });

  it('maps query errors', async () => {
    hp.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    });
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.kind).toBe('unknown');
  });

  it('sets plan null when query returns no row', async () => {
    hp.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
