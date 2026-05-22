// Inbound Kit Creator webhook handler.
// Validates HMAC-SHA256 signature, rate-limits by IP, records unsubscribes.
//
// Env vars required:
//   KIT_WEBHOOK_SECRET  — Kit dashboard → Webhooks → Signing secret
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const KIT_WEBHOOK_SECRET = Deno.env.get('KIT_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Pre-HMAC cap: limits raw request flood before signature verification (200/hr per IP).
const RAW_RATE_LIMIT = 200;
// Post-HMAC cap: limits valid-signature traffic (60/hr per IP).
const SIGNED_RATE_LIMIT = 60;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',').at(-1)?.trim() ?? 'unknown';
  return 'unknown';
}

async function verifyKitSignature(
  body: ArrayBuffer,
  sigHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!sigHeader?.startsWith('sha256=')) return false;
  const expected = sigHeader.slice(7);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, body);
  const actual = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // Constant-time string comparison to avoid timing oracles.
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Upsert a rate limit bucket; returns true if request is within the limit. */
async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  bucketKey: string,
  limit: number
): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0); // hour-truncated window

  const { data, error } = await admin.rpc('kit_webhook_check_rate_limit', {
    p_bucket_key: bucketKey,
    p_window_start: windowStart.toISOString(),
    p_limit: limit,
  });

  if (error) {
    // On DB error, fail open (allow) to avoid blocking legitimate Kit deliveries.
    console.error('kit-webhook rate limit check failed', error.message);
    return true;
  }
  return data as boolean;
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // Reject immediately when webhook secret is not configured — prevents silent
  // pass-through of unauthenticated requests during incomplete deploys. Kit
  // will retry on 503 once the secret is set.
  if (!KIT_WEBHOOK_SECRET) {
    return jsonResponse({ error: 'webhook_not_configured' }, 503);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ip = clientIp(req);

  // Pre-HMAC rate limit — caps request flood before spending CPU on signature verification.
  const withinRawLimit = await checkRateLimit(
    admin,
    `kit-webhook-raw:${ip}`,
    RAW_RATE_LIMIT
  );
  if (!withinRawLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  // Read raw bytes before any parsing — HMAC is computed over the raw body.
  const rawBody = await req.arrayBuffer();

  const sigHeader = req.headers.get('x-kit-signature');
  const valid = await verifyKitSignature(
    rawBody,
    sigHeader,
    KIT_WEBHOOK_SECRET
  );
  if (!valid) {
    return jsonResponse({ error: 'invalid_signature' }, 400);
  }

  // Post-HMAC rate limit — authenticated traffic only.
  const withinSignedLimit = await checkRateLimit(
    admin,
    `kit-webhook:${ip}`,
    SIGNED_RATE_LIMIT
  );
  if (!withinSignedLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody)) as Record<
      string,
      unknown
    >;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  // Kit v3 uses 'subscriber.unsubscribed'; Kit v4 uses 'subscriber.subscriber_unsubscribe'.
  // Handle both — first live staging delivery will confirm the name in info logs.
  const eventType = payload['type'] as string | undefined;
  console.info('kit-webhook received event', eventType);

  if (
    eventType === 'subscriber.unsubscribed' ||
    eventType === 'subscriber.subscriber_unsubscribe'
  ) {
    const subscriber = payload['subscriber'] as
      | Record<string, unknown>
      | undefined;
    const rawEmail = subscriber?.['email_address'] as string | undefined;
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
      console.warn('kit-webhook: unsubscribe payload missing email_address');
      return jsonResponse({ ok: true }, 200);
    }

    // Look up the enabled product.
    const { data: settings } = await admin
      .from('marketing_email_settings')
      .select('product_id')
      .eq('enabled', true)
      .order('product_id')
      .limit(1)
      .maybeSingle();

    if (!settings) {
      // Marketing email is disabled — nothing to record, acknowledge to Kit.
      return jsonResponse({ ok: true }, 200);
    }

    const { error: insertErr } = await admin
      .from('marketing_email_unsubscribes')
      .insert({ product_id: settings.product_id, email });

    // 23505 = unique_violation — idempotent, already recorded.
    if (insertErr && insertErr.code !== '23505') {
      console.error(
        'kit-webhook: failed to record unsubscribe',
        insertErr.message
      );
      // Return 500 so Kit retries — the row was not written.
      return jsonResponse({ error: 'db_error' }, 500);
    }

    // TODO(phase5): write audit row once admin_audit_log supports nullable actor_user_id
    // or a system-actor RPC is available. For now, marketing_email_unsubscribes.created_at
    // is the durable timestamp record.

    return jsonResponse({ ok: true }, 200);
  }

  // All other event types: acknowledge without processing. Logged above for observability.
  return jsonResponse({ ok: true }, 200);
});
