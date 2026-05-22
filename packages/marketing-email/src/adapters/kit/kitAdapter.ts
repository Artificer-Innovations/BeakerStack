import type { MarketingEmailAdapter } from '../../types.js';
import { MarketingEmailError } from '../../errors.js';
import type { KitAdapterConfig } from './kitConfig.js';

const KIT_API_BASE = 'https://api.kit.com/v4';

// Status codes that indicate a permanent failure — the Phase 3 worker should
// dead-letter these rather than retry (per #286 Phase 3 spec).
const PERMANENT_STATUS_CODES = new Set([
  'kit_api_400',
  'kit_api_404',
  'kit_api_422',
]);

export function isPermanentKitError(code: string): boolean {
  return PERMANENT_STATUS_CODES.has(code) || code === 'kit_tag_not_found';
}

export class KitAdapter implements MarketingEmailAdapter {
  constructor(
    private readonly config: KitAdapterConfig,
    private readonly apiKey: string
  ) {}

  // NOTE: Phase 3 bulk-sync will need to batch or use Kit bulk endpoints.
  // Each call here is 1 (subscribe) + 2–3 (findTag + apply) requests per tag,
  // so a signup with 3 tags is ~7 round-trips. Document expected call volume
  // in the Phase 3 kit-sync worker (#286).
  async subscribeUser(email: string, tags: string[]): Promise<void> {
    await this.post(`/forms/${this.config.formId}/subscribers`, {
      email_address: email,
    });
    for (const tag of tags) {
      await this.applyTag(email, tag);
    }
  }

  async applyTag(email: string, tag: string): Promise<void> {
    const tagId = await this.findTag(tag);
    if (!tagId) {
      throw new MarketingEmailError(
        `Kit tag "${tag}" not found — create it in the Kit dashboard before referencing it`,
        'kit_tag_not_found'
      );
    }
    await this.post(`/tags/${tagId}/subscribers`, { email_address: email });
  }

  async removeTag(email: string, tag: string): Promise<void> {
    const tagId = await this.findTag(tag);
    if (!tagId) return; // tag doesn't exist, nothing to remove
    await this.delete(
      `/subscribers/${encodeURIComponent(email)}/tags/${tagId}`
    );
  }

  async deleteUser(email: string): Promise<void> {
    // Kit v4 identifies subscribers by id — look up by email first.
    // Hard delete (not just unsubscribe) for GDPR deletion propagation per #286.
    const res = await this.get(
      `/subscribers?email_address=${encodeURIComponent(email)}`
    );
    const raw = res['subscribers'];
    const subscribers = Array.isArray(raw)
      ? (raw as Array<{ id: string }>)
      : [];
    const sub = subscribers[0];
    if (!sub?.id) return; // already deleted — idempotent
    await this.delete(`/subscribers/${sub.id}`);
  }

  private async findTag(name: string): Promise<string | null> {
    const res = await this.get(`/tags?name=${encodeURIComponent(name)}`);
    const raw = res['tags'];
    const tags = Array.isArray(raw)
      ? (raw as Array<{ id: string; name: string }>)
      : [];
    return tags.find(t => t.name === name)?.id ?? null;
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    return this.request('GET', path);
  }

  private async post(
    path: string,
    body: unknown
  ): Promise<Record<string, unknown>> {
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
      // Truncate to 200 chars — Kit error bodies can include PII (email, addresses).
      const truncated = text.slice(0, 200);
      throw new MarketingEmailError(
        `Kit API ${method} ${path} failed: ${res.status} ${res.statusText}${truncated ? ` — ${truncated}` : ''}`,
        `kit_api_${res.status}`
      );
    }
    // 204 No Content
    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
  }
}
