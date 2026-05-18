import type Stripe from 'npm:stripe@14.21.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0';
import { getBillingDeployTarget } from './billing-deploy-target.ts';
import {
  classifyStripeEventCore,
  deployTargetMismatch as deployTargetMismatchCore,
  redactedWebhookPayload as redactedWebhookPayloadCore,
  stripeSubscriptionIdFromRef,
  webhookPayloadForLog as webhookPayloadForLogCore,
} from './billing-webhook-guards-core.mjs';

export type ClassifyDecision =
  | { action: 'process'; ownedSubscription?: OwnedSubscriptionRow }
  | { action: 'ignore'; reason: string };

export type OwnedSubscriptionRow = {
  user_id: string;
  product_id: string;
  plan_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  pending_target_plan_id: string | null;
};

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

export function webhookPayloadForLog(
  event: Stripe.Event,
  decision: ClassifyDecision
): Record<string, unknown> {
  return webhookPayloadForLogCore(event.type, decision, event) as Record<
    string,
    unknown
  >;
}

export { stripeSubscriptionIdFromRef };

export async function findOwnedSubscription(
  supabase: SupabaseClient,
  stripeSubscriptionId: string
): Promise<OwnedSubscriptionRow | null> {
  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select(OWNED_SUBSCRIPTION_SELECT)
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `findOwnedSubscription failed: ${error.code ?? ''} ${error.message}`.trim()
    );
  }
  return (data as OwnedSubscriptionRow | null) ?? null;
}

/** Loads product ids once per webhook request; returns null if the query fails (skips optional product guard). */
async function loadAllowedProductIds(
  supabase: SupabaseClient
): Promise<Set<string> | null> {
  const { data, error } = await supabase.from('billing_products').select('id');
  if (error) {
    console.error(
      'loadAllowedProductIds failed; skipping product_id guard',
      error.message
    );
    return null;
  }
  return new Set((data ?? []).map((p: { id: string }) => p.id));
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

export function ownedSubscriptionFromDecision(
  decision: ClassifyDecision
): OwnedSubscriptionRow | undefined {
  return decision.action === 'process' ? decision.ownedSubscription : undefined;
}
