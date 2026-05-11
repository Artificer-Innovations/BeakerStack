import { beakerstackBillingConfig } from '../billing/beakerstackBillingConfig';

/** Namespaced key — sessionStorage (OAuth) + localStorage (email confirmation). */
export const POST_AUTH_REDIRECT_KEY = 'beakerstack:post_auth_redirect';

export const POST_AUTH_REDIRECT_TTL_MS = 30 * 60 * 1000;

const PUBLIC_PLAN_IDS: Set<string> = new Set(
  beakerstackBillingConfig.plans
    .filter(p => p.isPublic)
    .map(p => p.id)
);

function configPlanById(planId: string) {
  return beakerstackBillingConfig.plans.find(p => p.id === planId);
}

/**
 * Returns pathname + search for an in-app redirect, or null if unsafe / external.
 * Rejects protocol-relative URLs (e.g. //evil.com/...) and non-same-origin paths.
 */
export function validateInternalPostAuthPath(
  path: string,
  origin: string = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost'
): string | null {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  try {
    const u = new URL(trimmed, origin);
    if (u.origin !== new URL(origin).origin) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

/**
 * Synchronous post-auth path from signup/login URL search params.
 * Unknown or free plan → /dashboard; paid public plan → /billing/plans?…
 */
export function resolvePostAuthDestination(
  searchParams: URLSearchParams
): string {
  const planId = searchParams.get('plan');
  if (!planId || !PUBLIC_PLAN_IDS.has(planId)) return '/dashboard';

  const cfg = configPlanById(planId);
  if (!cfg || cfg.priceCents === 0) return '/dashboard';

  const cadence =
    searchParams.get('cadence') === 'annual' ? 'annual' : 'monthly';
  const q = new URLSearchParams();
  q.set('plan', planId);
  q.set('welcome', '1');
  if (cadence === 'annual') q.set('cadence', 'annual');
  return `/billing/plans?${q.toString()}`;
}

export function serializePostAuthRedirectPayload(path: string): string {
  return JSON.stringify({ path, ts: Date.now() });
}

/**
 * Parse stored JSON `{ path, ts }`, enforce TTL, validate path. Returns null if invalid/expired.
 * Non-JSON or malformed payloads return null (TTL always enforced; no legacy raw-path fallback).
 */
export function parseStoredPostAuthRedirect(
  raw: string | null,
  now: number = Date.now(),
  origin?: string
): string | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { path?: string; ts?: number };
    if (typeof o.path === 'string' && typeof o.ts === 'number') {
      if (now - o.ts > POST_AUTH_REDIRECT_TTL_MS) return null;
      return validateInternalPostAuthPath(o.path, origin);
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove intent from both storages (after successful email auth or when clearing stale OAuth stash). */
export function clearPostAuthRedirectKeys(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  }
}

/** Read intent once, clear both stores unconditionally, parse + TTL + validate. */
export function readAndClearPostAuthRedirect(): string | null {
  const rawS =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)
      : null;
  const rawL =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(POST_AUTH_REDIRECT_KEY)
      : null;
  clearPostAuthRedirectKeys();
  return (
    parseStoredPostAuthRedirect(rawS) ?? parseStoredPostAuthRedirect(rawL)
  );
}

export function hasPaidPlanIntent(searchParams: URLSearchParams): boolean {
  return resolvePostAuthDestination(searchParams) !== '/dashboard';
}
