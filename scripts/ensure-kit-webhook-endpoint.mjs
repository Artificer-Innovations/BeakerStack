#!/usr/bin/env node
/**
 * Ensures a Kit webhook exists for the Supabase kit-webhook URL.
 *
 * Env:
 *   KIT_API_KEY (required)
 *   KIT_WEBHOOK_URL (required) — full URL, e.g. https://<ref>.supabase.co/functions/v1/kit-webhook
 *   WEBHOOK_DESCRIPTION (optional) — log label only
 *
 * Note: Kit does not return the webhook signing secret via API. Set KIT_WEBHOOK_SECRET
 * in GitHub / Supabase separately (Kit dashboard → Webhooks → Signing secret).
 */
import process from 'node:process';

import { ensureKitWebhook } from './lib/ensure-kit-webhook.mjs';

async function main() {
  const apiKey = process.env.KIT_API_KEY;
  const url = process.env.KIT_WEBHOOK_URL;
  if (!apiKey || !url) {
    console.error(
      'Missing KIT_API_KEY or KIT_WEBHOOK_URL (full …/functions/v1/kit-webhook URL)'
    );
    process.exit(1);
  }

  const label =
    process.env.WEBHOOK_DESCRIPTION || 'BeakerStack CI (kit-webhook)';

  const result = await ensureKitWebhook({ apiKey, webhookUrl: url });

  if (result.created) {
    console.log(
      `Created Kit webhook ${result.webhookId} (${label}) → ${result.targetUrl}`
    );
    console.log(
      'Ensure KIT_WEBHOOK_SECRET is set (Kit dashboard → Webhooks → Signing secret).'
    );
  } else {
    console.log(
      `Kit webhook already configured (${label}) → ${result.targetUrl}`
    );
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
