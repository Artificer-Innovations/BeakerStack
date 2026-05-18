/**
 * Pure webhook guard logic (Node-testable). Deno wrapper: billing-webhook-guards.ts
 */

/** @typedef {{ action: 'process' }} ProcessDecision */
/** @typedef {{ action: 'ignore', reason: string }} IgnoreDecision */
/** @typedef {ProcessDecision | IgnoreDecision} ClassifyDecision */

/**
 * @param {Record<string, string> | null | undefined} metadata
 * @param {string} expectedTarget
 */
export function deployTargetMismatch(metadata, expectedTarget) {
  const got = metadata?.billing_deploy_target?.trim();
  return Boolean(got && got !== expectedTarget);
}

/**
 * @param {{ id?: string, type?: string, created?: number, livemode?: boolean, api_version?: string | null }} event
 */
export function redactedWebhookPayload(event) {
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    api_version: event.api_version ?? null,
    redacted: true,
  };
}

/**
 * @param {unknown} subRef
 * @returns {string | null}
 */
export function stripeSubscriptionIdFromRef(subRef) {
  if (typeof subRef === 'string') return subRef;
  if (subRef && typeof subRef === 'object' && 'id' in subRef) {
    const id = /** @type {{ id?: string }} */ (subRef).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

/**
 * @param {import('npm:stripe@14.21.0').Stripe.Event | { type: string, data?: { object?: unknown } }} event
 * @param {{
 *   expectedTarget: string,
 *   findOwnedSubscription: (stripeSubscriptionId: string) => Promise<unknown | null>,
 *   loadAllowedProductIds?: () => Promise<Set<string> | null>,
 * }} deps
 * @returns {Promise<ClassifyDecision>}
 */
export async function classifyStripeEventCore(event, deps) {
  const { expectedTarget, findOwnedSubscription, loadAllowedProductIds } = deps;

  const ownedOk = async subId => {
    if (!subId) return null;
    const row = await findOwnedSubscription(subId);
    if (!row)
      return { action: 'ignore', reason: 'unknown_stripe_subscription' };
    if (loadAllowedProductIds) {
      const allowed = await loadAllowedProductIds();
      if (
        allowed &&
        row.product_id &&
        !allowed.has(/** @type {{ product_id: string }} */ (row).product_id)
      ) {
        return { action: 'ignore', reason: 'unknown_product_id' };
      }
    }
    return row;
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = /** @type {{ metadata?: Record<string, string> }} */ (
        event.data?.object ?? {}
      );
      if (deployTargetMismatch(session.metadata, expectedTarget)) {
        return {
          action: 'ignore',
          reason: 'billing_deploy_target_mismatch',
        };
      }
      return { action: 'process' };
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end': {
      const stripeSub =
        /** @type {{ id: string, metadata?: Record<string, string> }} */ (
          event.data?.object ?? {}
        );
      if (deployTargetMismatch(stripeSub.metadata, expectedTarget)) {
        return {
          action: 'ignore',
          reason: 'billing_deploy_target_mismatch',
        };
      }
      const decision = await ownedOk(stripeSub.id);
      if (decision && 'action' in decision) return decision;
      return { action: 'process' };
    }
    case 'invoice.payment_failed': {
      const invoice = /** @type {{ subscription?: unknown }} */ (
        event.data?.object ?? {}
      );
      const subId = stripeSubscriptionIdFromRef(invoice.subscription);
      if (!subId) {
        return { action: 'ignore', reason: 'invoice_missing_subscription' };
      }
      const decision = await ownedOk(subId);
      if (decision && 'action' in decision) return decision;
      return { action: 'process' };
    }
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const invoice = /** @type {{ subscription?: unknown }} */ (
        event.data?.object ?? {}
      );
      const subId = stripeSubscriptionIdFromRef(invoice.subscription);
      if (!subId) {
        return { action: 'ignore', reason: 'invoice_missing_subscription' };
      }
      const decision = await ownedOk(subId);
      if (decision && 'action' in decision) return decision;
      return { action: 'process' };
    }
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.voided': {
      const invoice = /** @type {{ subscription?: unknown }} */ (
        event.data?.object ?? {}
      );
      const subId = stripeSubscriptionIdFromRef(invoice.subscription);
      if (!subId) {
        return { action: 'ignore', reason: 'invoice_missing_subscription' };
      }
      const decision = await ownedOk(subId);
      if (decision && 'action' in decision) return decision;
      return { action: 'process' };
    }
    default:
      return { action: 'process' };
  }
}
