import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Plan, SubscriptionRow } from '../types.js';
import {
  baseBillingContextExtras,
  testPlan,
  testSubscription,
} from '../test/billingFixtures.js';
import { useBillingState } from './useBillingState.js';

const hp = vi.hoisted(() => ({
  subscription: null as SubscriptionRow | null,
  subscriptionLoading: false,
  plan: null as Plan | null,
}));

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    subscription: hp.subscription,
    subscriptionLoading: hp.subscriptionLoading,
  }),
}));

vi.mock('./usePlan.js', () => ({
  usePlan: () => ({
    data: hp.plan,
    loading: false,
    error: null,
  }),
}));

describe('useBillingState', () => {
  beforeEach(() => {
    hp.subscription = testSubscription();
    hp.subscriptionLoading = false;
    hp.plan = testPlan();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns loading when subscription is loading', () => {
    hp.subscriptionLoading = true;
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('loading');
  });

  it('returns no_subscription when row missing', () => {
    hp.subscription = null;
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('no_subscription');
  });

  it('classifies free status', () => {
    hp.subscription = testSubscription({ status: 'free' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('free');
  });

  it('classifies past_due as payment_failed', () => {
    hp.subscription = testSubscription({ status: 'past_due' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('payment_failed');
  });

  it('classifies trialing with soon trial_end as trial_ending', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    hp.subscription = testSubscription({
      status: 'trialing',
      trial_end: '2025-01-02T12:00:00.000Z',
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('trial_ending');
  });

  it('classifies trialing with distant trial_end', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    hp.subscription = testSubscription({
      status: 'trialing',
      trial_end: '2025-02-01T12:00:00.000Z',
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('trialing');
  });

  it('classifies cancel_at_period_end without pending target as cancelled_pending', () => {
    hp.subscription = testSubscription({
      status: 'active',
      cancel_at_period_end: true,
      pending_target_plan_id: null,
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('cancelled_pending');
  });

  it('classifies cancel_at_period_end with pending target as downgrade_pending', () => {
    hp.subscription = testSubscription({
      status: 'active',
      cancel_at_period_end: true,
      pending_target_plan_id: 'plan_free',
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('downgrade_pending');
  });

  it('treats active without stripe subscription as free', () => {
    hp.subscription = testSubscription({
      status: 'active',
      stripe_subscription_id: null,
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('free');
  });

  it('classifies active with stripe as paid_active', () => {
    hp.subscription = testSubscription({
      status: 'active',
      stripe_subscription_id: 'sub_123',
    });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('paid_active');
  });

  it('maps canceled to free', () => {
    hp.subscription = testSubscription({ status: 'canceled' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('free');
  });

  it('classifies paused as paid_active', () => {
    hp.subscription = testSubscription({ status: 'paused' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('paid_active');
  });

  it('passes plan through from usePlan', () => {
    hp.plan = testPlan({ display_name: 'Pro' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.plan?.display_name).toBe('Pro');
  });

  it('defaults unrecognized status to paid_active', () => {
    hp.subscription = testSubscription({ status: 'unknown_status' });
    const { result } = renderHook(() => useBillingState());
    expect(result.current.kind).toBe('paid_active');
  });
});
