import { getBillingAllowedOrigins } from './billing-origins.ts';

export const corsAllowHeaders =
  'authorization, x-client-info, apikey, content-type, x-supabase-client';

export function corsHeadersForRequest(req: Request): HeadersInit {
  const origin = req.headers.get('Origin');
  const allowed = getBillingAllowedOrigins();

  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': corsAllowHeaders,
    };
  }

  if (allowed.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': corsAllowHeaders,
      Vary: 'Origin',
    };
  }

  return {
    'Access-Control-Allow-Headers': corsAllowHeaders,
    Vary: 'Origin',
  };
}

function mergeIntoHeaders(init: HeadersInit): Headers {
  const h = new Headers();
  if (init instanceof Headers) {
    init.forEach((v, k) => h.set(k, v));
    return h;
  }
  if (Array.isArray(init)) {
    for (const [k, v] of init) h.set(k, v);
    return h;
  }
  for (const [k, v] of Object.entries(init)) {
    h.set(k, String(v));
  }
  return h;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request
): Response {
  const base: HeadersInit = req
    ? corsHeadersForRequest(req)
    : {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': corsAllowHeaders,
      };
  const headers = mergeIntoHeaders(base);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}
