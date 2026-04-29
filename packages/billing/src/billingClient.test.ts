import { describe, expect, it, vi } from 'vitest';
import {
  canUserAccessFeature,
  getPlanById,
  getRemainingUsage,
  hasExceededLimit,
} from './billingClient.js';

function mockSupabase(chain: {
  sub?: { plan_id: string } | null;
  plan?: Record<string, unknown> | null;
  rpcRemaining?: Record<string, unknown> | null;
  rpcExceeded?: boolean;
}) {
  const from = vi.fn((table: string) => {
    if (table === 'billing_subscriptions') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: chain.sub ?? null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'billing_plans') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: chain.plan ?? null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  const rpc = vi.fn(async (name: string) => {
    if (name === 'billing_get_remaining_usage') {
      return { data: chain.rpcRemaining ?? null, error: null };
    }
    if (name === 'billing_has_exceeded_limit') {
      return { data: chain.rpcExceeded ?? false, error: null };
    }
    return { data: null, error: null };
  });

  return {
    from,
    rpc,
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('billingClient', () => {
  it('getRemainingUsage maps RPC payload', async () => {
    const supabase = mockSupabase({
      rpcRemaining: {
        used: 2,
        limit: 10,
        remaining: 8,
        periodEnd: '2026-01-31',
        periodStart: '2026-01-01',
      },
    });
    const r = await getRemainingUsage(supabase, 'beakerstack', 'ai_summarize');
    expect(r).toEqual({
      used: 2,
      limit: 10,
      remaining: 8,
      periodEnd: '2026-01-31',
      periodStart: '2026-01-01',
    });
  });

  it('hasExceededLimit returns boolean from RPC', async () => {
    const supabase = mockSupabase({ rpcExceeded: true });
    await expect(
      hasExceededLimit(supabase, 'beakerstack', 'ai_summarize')
    ).resolves.toBe(true);
  });

  it('getPlanById returns plan row', async () => {
    const supabase = mockSupabase({
      plan: {
        id: 'beakerstack_free',
        product_id: 'beakerstack',
        display_name: 'Free',
        price_cents: 0,
      },
    });
    const p = await getPlanById(supabase, 'beakerstack', 'beakerstack_free');
    expect(p?.display_name).toBe('Free');
  });

  it('canUserAccessFeature reads subscription plan features', async () => {
    const supabase = mockSupabase({
      sub: { plan_id: 'beakerstack_pro' },
      plan: {
        id: 'beakerstack_pro',
        product_id: 'beakerstack',
        features: { feature_a: true },
      },
    });
    await expect(
      canUserAccessFeature(supabase, 'user-1', 'beakerstack', 'feature_a')
    ).resolves.toBe(true);
  });

  it('getRemainingUsage maps omitted limit and remaining to null', async () => {
    const supabase = mockSupabase({
      rpcRemaining: {
        used: 1,
        periodEnd: '2026-01-31',
        periodStart: '2026-01-01',
      },
    });
    const r = await getRemainingUsage(supabase, 'beakerstack', 'ai_summarize');
    expect(r).toEqual({
      used: 1,
      limit: null,
      remaining: null,
      periodEnd: '2026-01-31',
      periodStart: '2026-01-01',
    });
  });

  it('getRemainingUsage returns null when unauthenticated', async () => {
    const supabase = mockSupabase({
      rpcRemaining: { error: 'unauthenticated' },
    });
    await expect(
      getRemainingUsage(supabase, 'beakerstack', 'ai_summarize')
    ).resolves.toBeNull();
  });
});
