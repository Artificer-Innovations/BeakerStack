#!/usr/bin/env node
/**
 * Ensures a Stripe webhook endpoint exists for the Supabase `stripe-webhook` URL and
 * exposes the signing secret for CI (GITHUB_OUTPUT) or the next `supabase secrets set`.
 *
 * Env:
 *   STRIPE_SECRET_KEY (required)
 *   STRIPE_WEBHOOK_URL (required) — full URL, e.g. https://<ref>.supabase.co/functions/v1/stripe-webhook
 *   STRIPE_WEBHOOK_SECRET (optional) — required when the endpoint already exists
 *   WEBHOOK_DESCRIPTION (optional) — Stripe Dashboard label
 */
import fs from 'node:fs';
import process from 'node:process';

import {
  ensureStripeWebhook,
  MissingWebhookSecretError,
} from './lib/ensure-stripe-webhook.mjs';

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
  const url = process.env.STRIPE_WEBHOOK_URL;
  if (!sk || !url) {
    console.error(
      'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_URL (full …/functions/v1/stripe-webhook URL)'
    );
    process.exit(1);
  }

  const description =
    process.env.WEBHOOK_DESCRIPTION || 'BeakerStack CI (stripe-webhook)';

  try {
    const result = await ensureStripeWebhook({
      secretKey: sk,
      webhookUrl: url,
      existingWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      description,
    });

    if (result.created) {
      console.log(
        `Created Stripe webhook endpoint ${result.endpointId} (${url.replace(/\/+$/, '')})`
      );
      console.log(
        'Save this signing secret as your GitHub STRIPE_WEBHOOK_* secret for future CI runs (Dashboard can also reveal it).'
      );
    } else if (result.eventsUpdated) {
      console.log(
        `Updated Stripe webhook endpoint ${result.endpointId} enabled_events (${url.replace(/\/+$/, '')})`
      );
    } else {
      console.log(
        `Stripe webhook endpoint already configured (${url.replace(/\/+$/, '')})`
      );
    }

    emitResolvedSecret(result.signingSecret);
  } catch (e) {
    if (e instanceof MissingWebhookSecretError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
