/**
 * Pure webhook guard logic (Node-testable). Deno wrapper: billing-webhook-guards.ts
 */

/** @typedef {{ action: 'process', ownedSubscription?: unknown }} ProcessDecision */
/** @typedef {{ action: 'ignore', reason: string }} IgnoreDecision */
/** @typedef {ProcessDecision | IgnoreDecision} ClassifyDecision */

/** Event types `processStripeEvent` mutates billing tables for (full payload logging). */
export const BILLING_WEBHOOK_HANDLED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_failed',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.created',
  'invoice.finalized',
  'invoice.voided',
]);

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
 * @param {string} eventType
 * @param {ClassifyDecision} decision
 * @param {{ id?: string, type?: string, created?: number, livemode?: boolean, api_version?: string | null, data?: unknown }} event
 */
export function webhookPayloadForLog(eventType, decision, event) {
  if (decision.action === 'ignore') return redactedWebhookPayload(event);
  if (!BILLING_WEBHOOK_HANDLED_EVENT_TYPES.has(eventType)) {
    return redactedWebhookPayload(event);
  }
  return event;
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
 * @param {string | null | undefined} subId
 * @param {(stripeSubscriptionId: string) => Promise<unknown | null>} findOwnedSubscription
 * @param {(() => Promise<Set<string> | null>) | undefined} loadAllowedProductIds
 * @returns {Promise<{ type: 'ignore', decision: IgnoreDecision } | { type: 'owned', row: unknown }>}
 */
async function resolveOwnedSubscription(
  subId,
  findOwnedSubscription,
  loadAllowedProductIds
) {
  if (!subId) {
    return {
      type: 'ignore',
      decision: {
        action: 'ignore',
        reason: 'unknown_stripe_subscription',
      },
    };
  }
  const row = await findOwnedSubscription(subId);
  if (!row) {
    return {
      type: 'ignore',
      decision: {
        action: 'ignore',
        reason: 'unknown_stripe_subscription',
      },
    };
  }
  if (loadAllowedProductIds) {
    const allowed = await loadAllowedProductIds();
    if (
      allowed &&
      /** @type {{ product_id?: string }} */ (row).product_id &&
      !allowed.has(/** @type {{ product_id: string }} */ (row).product_id)
    ) {
      return {
        type: 'ignore',
        decision: { action: 'ignore', reason: 'unknown_product_id' },
      };
    }
  }
  return { type: 'owned', row };
}

/** @param {{ type: 'owned', row: unknown }} result */
function processWithOwnedRow(result) {
  return { action: 'process', ownedSubscription: result.row };
}

/**
 * BeakerStack only syncs subscription-backed invoices; one-time invoices are ignored.
 * @param {{ subscription?: unknown }} invoice
 * @param {(stripeSubscriptionId: string) => Promise<unknown | null>} findOwnedSubscription
 * @param {(() => Promise<Set<string> | null>) | undefined} loadAllowedProductIds
 * @returns {Promise<ClassifyDecision>}
 */
async function classifyInvoiceEvent(
  invoice,
  findOwnedSubscription,
  loadAllowedProductIds
) {
  const subId = stripeSubscriptionIdFromRef(invoice.subscription);
  if (!subId) {
    return { action: 'ignore', reason: 'invoice_missing_subscription' };
  }
  const result = await resolveOwnedSubscription(
    subId,
    findOwnedSubscription,
    loadAllowedProductIds
  );
  if (result.type === 'ignore') return result.decision;
  return processWithOwnedRow(result);
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
        /** @type {{ id?: string, metadata?: Record<string, string> }} */ (
          event.data?.object ?? {}
        );
      if (deployTargetMismatch(stripeSub.metadata, expectedTarget)) {
        return {
          action: 'ignore',
          reason: 'billing_deploy_target_mismatch',
        };
      }
      const result = await resolveOwnedSubscription(
        stripeSub.id,
        findOwnedSubscription,
        loadAllowedProductIds
      );
      if (result.type === 'ignore') return result.decision;
      return processWithOwnedRow(result);
    }
    case 'invoice.payment_failed':
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.voided': {
      const invoice = /** @type {{ subscription?: unknown }} */ (
        event.data?.object ?? {}
      );
      return classifyInvoiceEvent(
        invoice,
        findOwnedSubscription,
        loadAllowedProductIds
      );
    }
    default:
      return { action: 'process' };
  }
}
