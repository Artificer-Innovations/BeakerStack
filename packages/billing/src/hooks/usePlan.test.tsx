import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { baseBillingContextExtras, testPlan } from '../test/billingFixtures.js';
import { usePlan } from './usePlan.js';
import type { Plan } from '../types.js';
import type { BillingError } from '../errors.js';

const hp = vi.hoisted(() => ({
  plan: null as Plan | null,
  planLoading: false,
  planError: null as BillingError | null,
}));

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    plan: hp.plan,
    planLoading: hp.planLoading,
    planError: hp.planError,
  }),
}));

describe('usePlan', () => {
  it('returns plan data from context', () => {
    hp.plan = testPlan();
    hp.planLoading = false;
    hp.planError = null;
    const { result } = renderHook(() => usePlan());
    expect(result.current.data?.id).toBe('plan_free');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state while plan is loading', () => {
    hp.plan = null;
    hp.planLoading = true;
    hp.planError = null;
    const { result } = renderHook(() => usePlan());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns null plan when not available', () => {
    hp.plan = null;
    hp.planLoading = false;
    hp.planError = null;
    const { result } = renderHook(() => usePlan());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces plan errors from context', () => {
    hp.plan = null;
    hp.planLoading = false;
    hp.planError = { kind: 'unknown', message: 'plan fetch failed' };
    const { result } = renderHook(() => usePlan());
    expect(result.current.error?.message).toBe('plan fetch failed');
    expect(result.current.data).toBeNull();
  });
});
