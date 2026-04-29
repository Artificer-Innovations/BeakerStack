#!/usr/bin/env node
/**
 * Ensures a Stripe webhook endpoint exists for the Supabase `stripe-webhook` URL and
 * exposes the signing secret for CI (GITHUB_OUTPUT) or the next `supabase secrets set`.
 *
 * - If no endpoint matches STRIPE_WEBHOOK_URL, creates one with the events used by
 *   `supabase/functions/stripe-webhook/index.ts`.
 * - If it already exists, updates `enabled_events` to match; the signing secret is only
 *   returned at create time, so STRIPE_WEBHOOK_SECRET must be set (e.g. GitHub secret
 *   from Dashboard → Reveal) on subsequent runs.
 *
 * Env:
 *   STRIPE_SECRET_KEY (required)
 *   STRIPE_WEBHOOK_URL (required) — full URL, e.g. https://<ref>.supabase.co/functions/v1/stripe-webhook
 *   STRIPE_WEBHOOK_SECRET (optional) — required when the endpoint already exists
 *   WEBHOOK_DESCRIPTION (optional) — Stripe Dashboard label
 */
import fs from 'node:fs';
import process from 'node:process';
import Stripe from 'stripe';

/** Keep in sync with `processStripeEvent` switch in stripe-webhook/index.ts */
const ENABLED_EVENTS = [
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

function emitResolvedSecret(secret) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) {
    fs.appendFileSync(
      outPath,
      `resolved_webhook_secret<<__WHSEC_EOF__\n${secret}\n__WHSEC_EOF__\n`
    );
  }
}

async function main() {
  const sk = process.env.STRIPE_SECRET_KEY;
  const url = process.env.STRIPE_WEBHOOK_URL?.replace(/\/+$/, '');
  if (!sk || !url) {
    console.error(
      'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_URL (full …/functions/v1/stripe-webhook URL)'
    );
    process.exit(1);
  }

  const stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
  const description =
    process.env.WEBHOOK_DESCRIPTION || 'BeakerStack CI (stripe-webhook)';

  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = list.data.find((e) => e.url.replace(/\/+$/, '') === url);

  let signingSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  if (found) {
    const sorted = [...ENABLED_EVENTS].sort();
    const current = [...(found.enabled_events || [])].sort();
    const needsUpdate =
      sorted.length !== current.length ||
      sorted.some((ev, i) => ev !== current[i]);

    if (needsUpdate) {
      await stripe.webhookEndpoints.update(found.id, {
        enabled_events: ENABLED_EVENTS,
        description,
      });
      console.log(
        `Updated Stripe webhook endpoint ${found.id} enabled_events (${url})`
      );
    } else {
      console.log(`Stripe webhook endpoint already configured (${url})`);
    }

    if (!signingSecret) {
      console.error(
        [
          'This Stripe account already has a webhook for this URL, but STRIPE_WEBHOOK_SECRET is not set.',
          'In Stripe Dashboard → Developers → Webhooks → select this endpoint → Reveal signing secret,',
          'then add it as the matching GitHub repository secret (e.g. PREVIEW_STRIPE_WEBHOOK_SECRET).',
        ].join('\n')
      );
      process.exit(1);
    }

    emitResolvedSecret(signingSecret);
    return;
  }

  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: ENABLED_EVENTS,
    description,
    api_version: '2023-10-16',
  });

  signingSecret = created.secret;
  if (!signingSecret) {
    console.error('Stripe did not return a signing secret for the new webhook endpoint.');
    process.exit(1);
  }

  console.log(`Created Stripe webhook endpoint ${created.id} (${url})`);
  console.log(
    'Save this signing secret as your GitHub STRIPE_WEBHOOK_* secret for future CI runs (Dashboard can also reveal it).'
  );

  emitResolvedSecret(signingSecret);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
