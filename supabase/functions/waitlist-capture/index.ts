import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  corsHeadersForWaitlist,
  jsonResponse,
} from '../_shared/waitlist-origins.ts';
import { enqueueMarketingEmail } from '../_shared/marketingEmailQueue.ts';

type Body = {
  email?: string;
  metadata?: Record<string, unknown>;
  honeypot?: string;
};

function clientIp(req: Request): string | null {
  const cfConnecting = req.headers.get('cf-connecting-ip');
  if (cfConnecting) return cfConnecting.trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',').at(-1)?.trim() ?? null;
  return null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForWaitlist(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, req);
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('BILLING_SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('BILLING_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500, req);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, req);
  }

  if (body.honeypot) {
    return jsonResponse(
      { ok: true, message: 'Thanks — you are on the list.' },
      200,
      req
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return jsonResponse({ error: 'invalid_email' }, 400, req);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc('waitlist_capture', {
    p_email: email,
    p_metadata: body.metadata ?? {},
    p_client_ip: clientIp(req),
  });

  if (error) {
    console.error('waitlist_capture error', error.message);
    return jsonResponse(
      { ok: true, message: 'Thanks — you are on the list.' },
      200,
      req
    );
  }

  const envProductId = Deno.env.get('WAITLIST_PRODUCT_ID');
  if (!envProductId) {
    console.warn('WAITLIST_PRODUCT_ID is not set; defaulting to "beakerstack"');
  }
  const productId = envProductId || 'beakerstack';

  const metadata = body.metadata ?? {};
  // Hoist plan_id to the top level of the queue payload so the kit-sync worker
  // can apply the interest tag without digging into the metadata envelope.
  // Validate it's a non-empty string so a malformed client can't poison the queue.
  const rawPlanId = metadata.plan_id;
  const planId = typeof rawPlanId === 'string' && rawPlanId.trim() ? rawPlanId.trim() : null;
  await enqueueMarketingEmail(
    admin,
    productId,
    'waitlist.joined',
    email,
    {
      metadata,
      ...(planId ? { plan_id: planId } : {}),
    },
    `waitlist.joined:${email}`
  );

  return jsonResponse(data ?? { ok: true }, 200, req);
});
