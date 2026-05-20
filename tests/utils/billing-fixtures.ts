/**
 * Billing helpers for integration tests (demo mode / seeded plans).
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const BILLING_PRODUCT_ID = 'beakerstack';
export const BILLING_FREE_PLAN_ID = 'beakerstack_free';
export const BILLING_PRO_PLAN_ID = 'beakerstack_pro';
export const BILLING_USAGE_EVENT = 'ai_summarize';

export async function ensureFreeSubscription(
  supabase: SupabaseClient,
  productId = BILLING_PRODUCT_ID
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('ensure_billing_subscription', {
    p_product_id: productId,
  });
  if (error) {
    throw new Error(`ensure_billing_subscription failed: ${error.message}`);
  }
  return data as Record<string, unknown>;
}

export async function simulateProUpgrade(
  supabase: SupabaseClient,
  productId = BILLING_PRODUCT_ID,
  planId = BILLING_PRO_PLAN_ID
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('billing_demo_simulate_upgrade', {
    p_product_id: productId,
    p_plan_id: planId,
  });
  if (error) {
    throw new Error(`billing_demo_simulate_upgrade failed: ${error.message}`);
  }
  return data as Record<string, unknown>;
}

export async function resetBillingUsage(
  supabase: SupabaseClient,
  productId = BILLING_PRODUCT_ID,
  eventType = BILLING_USAGE_EVENT
): Promise<void> {
  const { error } = await supabase.rpc('billing_demo_reset_usage', {
    p_product_id: productId,
    p_event_type: eventType,
  });
  if (error) {
    throw new Error(`billing_demo_reset_usage failed: ${error.message}`);
  }
}

export async function getRemainingUsage(
  supabase: SupabaseClient,
  productId = BILLING_PRODUCT_ID,
  eventType = BILLING_USAGE_EVENT
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('billing_get_remaining_usage', {
    p_product_id: productId,
    p_event_type: eventType,
  });
  if (error) {
    throw new Error(`billing_get_remaining_usage failed: ${error.message}`);
  }
  return data as Record<string, unknown>;
}
