import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
  testPlan,
} from '../test/billingFixtures.js';
import { usePlanCatalog } from './usePlanCatalog.js';

const { order, mockSupabase } = vi.hoisted(() => {
  const order = vi.fn();
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order,
          })),
        })),
      })),
    })),
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { order, mockSupabase };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    supabase: mockSupabase,
    config: testBillingConfig,
  }),
}));

describe('usePlanCatalog', () => {
  beforeEach(() => {
    order.mockReset();
    order.mockResolvedValue({ data: [testPlan()], error: null });
  });

  it('loads public plans', async () => {
    const { result } = renderHook(() => usePlanCatalog());
    await waitFor(() => expect(result.current.plans.length).toBe(1));
    expect(result.current.plans[0].id).toBe('plan_free');
    expect(result.current.error).toBeNull();
  });

  it('maps query errors', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'db' } });
    const { result } = renderHook(() => usePlanCatalog());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.plans).toEqual([]);
  });
});
