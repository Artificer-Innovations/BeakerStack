/** Origins commonly used when SUPABASE_URL points at local `supabase start`. */
const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://[::1]:8081',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
] as const;

function isLocalSupabaseApiHostname(hostname: string): boolean {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

function isLocalSupabaseApiUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return isLocalSupabaseApiHostname(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Edge Functions run in Docker for `supabase start`; `SUPABASE_URL` is often an internal
 * hostname (e.g. `kong`) not `127.0.0.1`, so {@link isLocalSupabaseApiUrl} alone would skip
 * merging {@link LOCAL_DEV_ORIGINS} and every portal/checkout redirect would fail with
 * `invalid_redirect_url` even for `http://localhost:5173`.
 */
function isLocalSupabaseStack(supabaseUrl: string | undefined): boolean {
  if (isLocalSupabaseApiUrl(supabaseUrl)) return true;
  if (!supabaseUrl) return false;
  try {
    const u = new URL(supabaseUrl);
    // Default local API port from supabase/config.toml [api].port (not used by hosted projects).
    if (u.port === '54321') return true;
    // Typical internal API gateway hostname in local Docker Compose.
    if (u.hostname === 'kong') return true;
  } catch {
    return false;
  }
  return false;
}

function mergeEnvOrigins(set: Set<string>): void {
  const raw = Deno.env.get('BILLING_ALLOWED_ORIGINS');
  if (!raw) return;
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (!t) continue;
    try {
      const u = new URL(t);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        set.add(u.origin);
      } else {
        set.add(t);
      }
    } catch {
      set.add(t);
    }
  }
}

export function getBillingAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  mergeEnvOrigins(set);
  if (isLocalSupabaseStack(Deno.env.get('SUPABASE_URL'))) {
    for (const o of LOCAL_DEV_ORIGINS) set.add(o);
  }
  return set;
}

/** Validates Stripe checkout / portal redirect URLs against the billing origin allowlist. */
export function assertRedirectUrlAllowed(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new RedirectValidationError();
  }
  const origin = url.origin;
  const allowed = getBillingAllowedOrigins();
  if (!allowed.has(origin)) {
    throw new RedirectValidationError();
  }
  const isLive = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').startsWith(
    'sk_live_'
  );
  if (isLive && url.protocol === 'http:') {
    throw new RedirectValidationError();
  }
}

export class RedirectValidationError extends Error {
  constructor() {
    super('invalid_redirect_url');
    this.name = 'RedirectValidationError';
  }
}
