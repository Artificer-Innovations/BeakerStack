import type Stripe from 'npm:stripe@14.21.0';
import type { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { getBillingDeployTarget } from './billing-deploy-target.ts';
import {
  classifyStripeEventCore,
  deployTargetMismatch as deployTargetMismatchCore,
  redactedWebhookPayload as redactedWebhookPayloadCore,
  stripeSubscriptionIdFromRef,
} from './billing-webhook-guards-core.mjs';

export type ClassifyDecision =
  | { action: 'process' }
  | { action: 'ignore'; reason: string };

export type OwnedSubscriptionRow = {
  user_id: string;
  product_id: string;
  plan_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  pending_target_plan_id: string | null;
};

type SupabaseClient = ReturnType<typeof createClient>;

const OWNED_SUBSCRIPTION_SELECT =
  'user_id, product_id, plan_id, current_period_start, current_period_end, pending_target_plan_id';

export function deployTargetMismatch(
  metadata: Record<string, string> | null | undefined
): boolean {
  return deployTargetMismatchCore(metadata, getBillingDeployTarget());
}

export function redactedWebhookPayload(
  event: Stripe.Event
): Record<string, unknown> {
  return redactedWebhookPayloadCore(event);
}

export { stripeSubscriptionIdFromRef };

export async function findOwnedSubscription(
  supabase: SupabaseClient,
  stripeSubscriptionId: string
): Promise<OwnedSubscriptionRow | null> {
  const { data } = await supabase
    .from('billing_subscriptions')
    .select(OWNED_SUBSCRIPTION_SELECT)
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  return (data as OwnedSubscriptionRow | null) ?? null;
}

let allowedProductIdsCache: Set<string> | null = null;

async function loadAllowedProductIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  if (allowedProductIdsCache) return allowedProductIdsCache;
  const { data } = await supabase.from('billing_products').select('id');
  allowedProductIdsCache = new Set(
    (data ?? []).map((p: { id: string }) => p.id)
  );
  return allowedProductIdsCache;
}

export async function classifyStripeEvent(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<ClassifyDecision> {
  return classifyStripeEventCore(event, {
    expectedTarget: getBillingDeployTarget(),
    findOwnedSubscription: id => findOwnedSubscription(supabase, id),
    loadAllowedProductIds: () => loadAllowedProductIds(supabase),
  }) as Promise<ClassifyDecision>;
}
