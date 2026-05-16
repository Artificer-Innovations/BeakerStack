/**
 * Non-authoritative hint for marketing chrome only. Session validity must still
 * go through Supabase / ProtectedRoute.
 *
 * Storage key matches supabase-js defaults:
 * `sb-${hostname.split('.')[0]}-auth-token` (see SupabaseClient constructor).
 *
 * Optional override: VITE_SUPABASE_AUTH_STORAGE_KEY
 */

export function getSupabaseAuthStorageKey(): string | null {
  const override = import.meta.env.VITE_SUPABASE_AUTH_STORAGE_KEY as
    | string
    | undefined;
  if (override?.trim()) return override.trim();

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url?.trim()) return null;

  try {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const normalized = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
    const baseUrl = new URL(normalized);
    return `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

/** Matches gotrue-js / supabase-js v2 persisted session JSON (`access_token` at top level). */
function sessionBlobLooksPresent(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const token = (parsed as Record<string, unknown>).access_token;
  return typeof token === 'string' && token.length > 0;
}

export function getLikelyAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getSupabaseAuthStorageKey();
    if (!key) return false;
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    return sessionBlobLooksPresent(JSON.parse(raw));
  } catch {
    return false;
  }
}
