const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173',
] as const;

function parseOriginsList(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (t) set.add(t);
  }
  return set;
}

export function getWaitlistAllowedOrigins(): Set<string> {
  const fromEnv = parseOriginsList(Deno.env.get('WAITLIST_ALLOWED_ORIGINS'));
  const billing = parseOriginsList(Deno.env.get('BILLING_ALLOWED_ORIGINS'));
  const merged = new Set<string>([...fromEnv, ...billing]);
  for (const o of LOCAL_DEV_ORIGINS) merged.add(o);
  return merged;
}

export function corsHeadersForWaitlist(req: Request): HeadersInit {
  const origin = req.headers.get('Origin');
  const allowed = getWaitlistAllowedOrigins();
  const allowHeaders =
    'authorization, x-client-info, apikey, content-type, x-supabase-client';

  if (!origin) {
    return {
      'Access-Control-Allow-Headers': allowHeaders,
    };
  }

  if (allowed.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': allowHeaders,
      Vary: 'Origin',
    };
  }

  return {
    'Access-Control-Allow-Headers': allowHeaders,
    Vary: 'Origin',
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  req: Request
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(corsHeadersForWaitlist(req))),
    },
  });
}
