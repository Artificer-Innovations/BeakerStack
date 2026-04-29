import type { SupabaseClient } from '@supabase/supabase-js';
import { isFeatureAccessible, readPlanFeatureValue } from './featureAccess.js';
import type { Plan } from './types.js';

export type RemainingUsageResult = {
  used: number;
  limit: number | null;
  remaining: number | null;
  periodEnd: string;
  periodStart: string;
};

/**
 * Spec-aligned name for remaining usage (wraps `billing_get_remaining_usage` RPC).
 */
export async function getRemainingUsage(
  supabase: SupabaseClient,
  productId: string,
  eventType: string
): Promise<RemainingUsageResult | null> {
  const { data, error } = await supabase.rpc('billing_get_remaining_usage', {
    p_product_id: productId,
    p_event_type: eventType,
  });
  if (error) throw error;
  const j = data as Record<string, unknown> | null;
  if (!j || j['error'] === 'unauthenticated') return null;
  return {
    used: Number(j['used'] ?? 0),
    limit:
      j['limit'] === null || typeof j['limit'] === 'undefined'
        ? null
        : Number(j['limit']),
    remaining:
      j['remaining'] === null || typeof j['remaining'] === 'undefined'
        ? null
        : Number(j['remaining']),
    periodEnd: String(j['periodEnd'] ?? ''),
    periodStart: String(j['periodStart'] ?? ''),
  };
}

/** Spec-aligned name (wraps `billing_has_exceeded_limit` RPC). */
export async function hasExceededLimit(
  supabase: SupabaseClient,
  productId: string,
  eventType: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('billing_has_exceeded_limit', {
    p_product_id: productId,
    p_event_type: eventType,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Spec `getPlan(planId)` — loads one plan row for a product. */
export async function getPlanById(
  supabase: SupabaseClient,
  productId: string,
  planId: string
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('product_id', productId)
    .eq('id', planId)
    .maybeSingle();
  if (error) throw error;
  return (data as Plan | null) ?? null;
}

/**
 * Resolves current subscription plan features and applies boolean accessibility.
 * For **numeric** feature caps, combine with `getRemainingUsage` / `hasExceededLimit`.
 */
export async function canUserAccessFeature(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  featureName: string
): Promise<boolean> {
  const { data: sub, error } = await supabase
    .from('billing_subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!sub?.plan_id) return false;
  const plan = await getPlanById(supabase, productId, sub.plan_id);
  return isFeatureAccessible(plan?.features, featureName);
}

export { readPlanFeatureValue, isFeatureAccessible };
