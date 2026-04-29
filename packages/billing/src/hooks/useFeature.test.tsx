import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { InferFeatureKeys } from '../schema.js';
import { testBillingConfig } from '../test/billingFixtures.js';
import { useFeature } from './useFeature.js';
import { usePlan } from './usePlan.js';

vi.mock('./usePlan.js', () => ({
  usePlan: vi.fn(),
}));

type TestConfig = typeof testBillingConfig;
type TestFeatureKey = InferFeatureKeys<TestConfig> & string;

describe('useFeature', () => {
  beforeEach(() => {
    vi.mocked(usePlan).mockReset();
  });

  it('returns loading state when plan is missing', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });
    const { result } = renderHook(() =>
      useFeature<TestConfig, TestFeatureKey>('feature_x')
    );
    expect(result.current.enabled).toBe(false);
    expect(result.current.value).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('maps boolean feature to enabled and value', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: {
        id: 'p',
        product_id: 'x',
        display_name: 'P',
        description: null,
        price_cents: 0,
        billing_period: 'free',
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        stripe_product_id: null,
        features: { feature_x: true },
        usage_limits: {},
        trial_period_days: 0,
        is_public: true,
        display_order: 1,
      },
      loading: false,
      error: null,
    });
    const { result } = renderHook(() =>
      useFeature<TestConfig, TestFeatureKey>('feature_x')
    );
    expect(result.current.enabled).toBe(true);
    expect(result.current.value).toBe(true);
  });

  it('maps numeric feature to enabled with numeric value', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: {
        id: 'p',
        product_id: 'x',
        display_name: 'P',
        description: null,
        price_cents: 0,
        billing_period: 'free',
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        stripe_product_id: null,
        features: { num: 7 },
        usage_limits: {},
        trial_period_days: 0,
        is_public: true,
        display_order: 1,
      },
      loading: false,
      error: null,
    });
    const { result } = renderHook(() =>
      useFeature<TestConfig, TestFeatureKey>('num')
    );
    expect(result.current.enabled).toBe(true);
    expect(result.current.value).toBe(7);
  });

  it('treats absent feature on plan as disabled', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: {
        id: 'p',
        product_id: 'x',
        display_name: 'P',
        description: null,
        price_cents: 0,
        billing_period: 'free',
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        stripe_product_id: null,
        features: { feature_x: true },
        usage_limits: {},
        trial_period_days: 0,
        is_public: true,
        display_order: 1,
      },
      loading: false,
      error: null,
    });
    const { result } = renderHook(() =>
      useFeature<TestConfig, TestFeatureKey>('num')
    );
    expect(result.current.enabled).toBe(false);
    expect(result.current.value).toBeNull();
  });
});
