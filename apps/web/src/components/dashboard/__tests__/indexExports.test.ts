import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() } },
  supabaseRpc: { rpc: vi.fn() },
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingContext: () => ({
      config: { productId: 'test' },
      refreshSubscription: vi.fn(),
    }),
    useUsage: () => ({
      used: 0,
      limit: null,
      exceeded: false,
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    useFeature: () => ({ value: null, enabled: false, loading: false }),
    usePlan: () => ({ data: null, loading: false, error: null }),
  };
});

import {
  AnnotatedPrimitive,
  BooleanFeatureTiles,
  CollectionDetail,
  CollectionsGrid,
  DemoBanner,
  DeveloperConsole,
  FeatureGateCard,
  UsageStrip,
} from '../index';

describe('dashboard index exports', () => {
  it('re-exports dashboard components', () => {
    expect(typeof AnnotatedPrimitive).toBe('function');
    expect(typeof BooleanFeatureTiles).toBe('function');
    expect(typeof CollectionDetail).toBe('function');
    expect(typeof CollectionsGrid).toBe('function');
    expect(typeof DemoBanner).toBe('function');
    expect(typeof DeveloperConsole).toBe('function');
    expect(typeof FeatureGateCard).toBe('function');
    expect(typeof UsageStrip).toBe('function');
  });
});
