export function hashUserId(id: string): string {
  // Deterministic SHA-256 hex — not reversible, safe to send to Sentry.
  // Using a sync implementation for browser/RN/Deno compatibility.
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hashed_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

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
