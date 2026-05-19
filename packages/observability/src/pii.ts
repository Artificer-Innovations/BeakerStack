export function hashUserId(id: string): string {
  // FNV-1a 64-bit pseudonymisation — deterministic, non-reversible at scale,
  // works sync in browser/RN/Deno. Not cryptographic SHA-256.
  let h = 0xcbf29ce484222325n;
  const fnvPrime = 0x100000001b3n;
  for (let i = 0; i < id.length; i++) {
    h ^= BigInt(id.charCodeAt(i));
    h = BigInt.asUintN(64, h * fnvPrime);
  }
  return `u_${h.toString(16).padStart(16, '0')}`;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function scrubEmail(str: string): string {
  return str.replace(EMAIL_PATTERN, '[email]');
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'authorization', 'auth', 'credential', 'private_key',
  'email', 'ssn', 'credit_card', 'card_number',
]);

export function scrubRequest(body: unknown): unknown {
  if (body === null || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(scrubRequest);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[redacted]';
    } else {
      result[key] = scrubRequest(value);
    }
  }
  return result;
}
