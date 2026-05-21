// Kit Creator API v4 client for Deno Edge Functions.
// Self-contained (no npm imports); ported from packages/marketing-email/src/adapters/kit/.
// Shared across kit-sync and kit-webhook via relative import.

const KIT_API_BASE = 'https://api.kit.com/v4';

// Status codes that signal a permanent failure — the worker dead-letters these
// immediately rather than retrying (per #286 Phase 3 spec).
const PERMANENT_ERROR_CODES = new Set([
  'kit_api_400',
  'kit_api_404',
  'kit_api_422',
  'unknown_event_type', // unknown events will never succeed — skip retry cycle
]);

export function isPermanentKitError(code: string): boolean {
  return PERMANENT_ERROR_CODES.has(code) || code === 'kit_tag_not_found';
}

// 429 is transient (rate limit) — worker should reset to pending without
// incrementing attempts so the row is retried on the next cron tick.
export function isRateLimitError(code: string): boolean {
  return code === 'kit_api_429';
}

// ── Tag helpers (mirrors packages/marketing-email/src/adapters/kit/kitTagScheme.ts) ──

export interface TagSchemeOpts {
  separator?: string;
  tierPrefix?: string;
}

const DEFAULT_SEP = ':';
const DEFAULT_TIER_PREFIX = 'tier';

export function waitlistTag(ns: string, opts?: TagSchemeOpts): string {
  return `${ns}${opts?.separator ?? DEFAULT_SEP}waitlist`;
}

export function waitlistApprovedTag(ns: string, opts?: TagSchemeOpts): string {
  return `${ns}${opts?.separator ?? DEFAULT_SEP}waitlist-approved`;
}

export function convertedTag(ns: string, opts?: TagSchemeOpts): string {
  return `${ns}${opts?.separator ?? DEFAULT_SEP}converted`;
}

export function signupTag(ns: string, opts?: TagSchemeOpts): string {
  return `${ns}${opts?.separator ?? DEFAULT_SEP}signup`;
}

export function tierTag(ns: string, tier: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  const prefix = opts?.tierPrefix ?? DEFAULT_TIER_PREFIX;
  return `${ns}${sep}${prefix}${sep}${tier}`;
}

export function churnedTag(ns: string, opts?: TagSchemeOpts): string {
  return `${ns}${opts?.separator ?? DEFAULT_SEP}churned`;
}

export function interestTag(ns: string, tier: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${ns}${sep}interest${sep}${tier}`;
}

// ── KitClientError ────────────────────────────────────────────────────────────

export class KitClientError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'KitClientError';
  }
}

// ── KitClient ─────────────────────────────────────────────────────────────────

export class KitClient {
  constructor(private readonly apiKey: string) {}

  async subscribeToForm(email: string, formId: string): Promise<void> {
    await this.post(`/forms/${formId}/subscribers`, { email_address: email });
  }

  async applyTag(email: string, tagName: string): Promise<void> {
    const tagId = await this.findTag(tagName);
    if (!tagId) {
      throw new KitClientError(
        `Kit tag "${tagName}" not found — create it in the Kit dashboard before referencing it`,
        'kit_tag_not_found'
      );
    }
    await this.post(`/tags/${tagId}/subscribers`, { email_address: email });
  }

  async removeTag(email: string, tagName: string): Promise<void> {
    const tagId = await this.findTag(tagName);
    if (!tagId) return; // tag doesn't exist — idempotent
    // Kit API DELETE /v4/subscribers/{subscriber_id}/tags/{tag_id} requires numeric ID, not email.
    const subId = await this.findSubscriberId(email);
    if (!subId) return; // subscriber not in Kit — idempotent
    await this.delete(`/subscribers/${subId}/tags/${tagId}`);
  }

  // Marks subscriber as unsubscribed in Kit (subscriber remains; tags retained).
  // Use for in-app marketing opt-out; NOT for GDPR deletion (use deleteUser).
  async unsubscribeUser(email: string): Promise<void> {
    const subId = await this.findSubscriberId(email);
    if (!subId) return; // not in Kit — idempotent
    await this.post(`/subscribers/${subId}/unsubscribe`, {});
  }

  // Hard-deletes the subscriber from Kit for GDPR erasure propagation.
  async deleteUser(email: string): Promise<void> {
    const subId = await this.findSubscriberId(email);
    if (!subId) return; // already deleted — idempotent
    await this.delete(`/subscribers/${subId}`);
  }

  private async findTag(name: string): Promise<string | null> {
    // per_page=1: tag names are unique in Kit; single result avoids pagination.
    const res = await this.get(`/tags?name=${encodeURIComponent(name)}&per_page=1`);
    const tags = (res['tags'] as Array<{ id: string; name: string }> | undefined) ?? [];
    return tags.find(t => t.name === name)?.id ?? null;
  }

  private async findSubscriberId(email: string): Promise<string | null> {
    const res = await this.get(`/subscribers?email_address=${encodeURIComponent(email)}`);
    const subs = (res['subscribers'] as Array<{ id: string }> | undefined) ?? [];
    return subs[0]?.id ?? null;
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    return this.request('GET', path);
  }

  private async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    return this.request('POST', path, body);
  }

  private async delete(path: string): Promise<Record<string, unknown>> {
    return this.request('DELETE', path);
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${KIT_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Truncate to 200 chars — Kit error bodies can include PII.
      throw new KitClientError(
        `Kit API ${method} ${path} → ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`,
        `kit_api_${res.status}`
      );
    }

    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
  }
}
