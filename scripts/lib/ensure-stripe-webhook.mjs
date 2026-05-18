/**
 * Ensure a Stripe webhook endpoint exists for a Supabase `stripe-webhook` URL.
 * Shared by CI (`ensure-stripe-webhook-endpoint.mjs`) and setup:full stripe phase.
 */

import Stripe from 'stripe';

/** Keep in sync with `processStripeEvent` switch in stripe-webhook/index.ts */
export const STRIPE_WEBHOOK_ENABLED_EVENTS = [
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
];

export class MissingWebhookSecretError extends Error {
  /** @param {string} webhookUrl */
  constructor(webhookUrl) {
    super(
      [
        'This Stripe account already has a webhook for this URL, but no signing secret was provided.',
        'In Stripe Dashboard → Developers → Webhooks → select this endpoint → Reveal signing secret,',
        'then add it as the matching repository secret (e.g. PREVIEW_STRIPE_WEBHOOK_SECRET).',
        `URL: ${webhookUrl}`,
      ].join('\n')
    );
    this.name = 'MissingWebhookSecretError';
    this.webhookUrl = webhookUrl;
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeStripeWebhookUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

/**
 * Hosted Supabase projects can receive Stripe Dashboard webhooks; local/docker cannot.
 * @param {string} webhookUrl
 * @returns {boolean}
 */
export function isAutoEnsureStripeWebhookUrl(webhookUrl) {
  const normalized = normalizeStripeWebhookUrl(webhookUrl);
  if (!normalized) return false;
  try {
    const u = new URL(normalized);
    return (
      u.protocol === 'https:' &&
      /\.supabase\.co$/i.test(u.hostname) &&
      u.pathname === '/functions/v1/stripe-webhook'
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} secretKey
 * @param {'test' | 'live'} expectedMode
 * @returns {boolean}
 */
export function stripeSecretKeyMatchesMode(secretKey, expectedMode) {
  const sk = String(secretKey || '').trim();
  if (expectedMode === 'live') return sk.startsWith('sk_live_');
  return sk.startsWith('sk_test_');
}

/**
 * @param {{
 *   secretKey: string;
 *   webhookUrl: string;
 *   existingWebhookSecret?: string;
 *   description?: string;
 *   stripe?: import('stripe').Stripe;
 * }} opts
 * @returns {Promise<{
 *   signingSecret: string;
 *   created: boolean;
 *   endpointId: string;
 *   eventsUpdated: boolean;
 * }>}
 */
export async function ensureStripeWebhook(opts) {
  const secretKey = String(opts.secretKey || '').trim();
  const url = normalizeStripeWebhookUrl(opts.webhookUrl);
  if (!secretKey || !url) {
    throw new Error('ensureStripeWebhook requires secretKey and webhookUrl');
  }

  const stripe =
    opts.stripe ?? new Stripe(secretKey, { apiVersion: '2023-10-16' });
  const description =
    opts.description?.trim() || 'BeakerStack (stripe-webhook)';

  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = list.data.find(e => normalizeStripeWebhookUrl(e.url) === url);

  let signingSecret = String(opts.existingWebhookSecret || '').trim();

  if (found) {
    const sorted = [...STRIPE_WEBHOOK_ENABLED_EVENTS].sort();
    const current = [...(found.enabled_events || [])].sort();
    const needsUpdate =
      sorted.length !== current.length ||
      sorted.some((ev, i) => ev !== current[i]);

    let eventsUpdated = false;
    if (needsUpdate) {
      await stripe.webhookEndpoints.update(found.id, {
        enabled_events: STRIPE_WEBHOOK_ENABLED_EVENTS,
        description,
      });
      eventsUpdated = true;
    }

    if (!signingSecret) {
      throw new MissingWebhookSecretError(url);
    }

    return {
      signingSecret,
      created: false,
      endpointId: found.id,
      eventsUpdated,
    };
  }

  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: STRIPE_WEBHOOK_ENABLED_EVENTS,
    description,
    api_version: '2023-10-16',
  });

  signingSecret = created.secret || '';
  if (!signingSecret) {
    throw new Error(
      'Stripe did not return a signing secret for the new webhook endpoint.'
    );
  }

  return {
    signingSecret,
    created: true,
    endpointId: created.id,
    eventsUpdated: false,
  };
}
