import type { MarketingEmailAdapter } from '../../types.js';
import { MarketingEmailError } from '../../errors.js';
import type { KitAdapterConfig } from './kitConfig.js';

const KIT_API_BASE = 'https://api.kit.com/v4';

export class KitAdapter implements MarketingEmailAdapter {
  constructor(
    private readonly config: KitAdapterConfig,
    private readonly apiKey: string
  ) {}

  async subscribeUser(email: string, tags: string[]): Promise<void> {
    await this.post(`/forms/${this.config.formId}/subscribers`, {
      email_address: email,
    });
    for (const tag of tags) {
      await this.applyTag(email, tag);
    }
  }

  async applyTag(email: string, tag: string): Promise<void> {
    // Kit requires finding/creating the tag by name, then applying it
    const tagId = await this.findOrCreateTag(tag);
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
    // Kit v4: unsubscribe globally
    await this.delete(`/subscribers/${encodeURIComponent(email)}`);
  }

  private async findOrCreateTag(name: string): Promise<string> {
    const existing = await this.findTag(name);
    if (existing) return existing;
    const res = await this.post('/tags', { name });
    const tag = res['tag'] as { id: string } | undefined;
    if (!tag?.id) {
      throw new MarketingEmailError(
        'Kit API POST /tags response missing tag id',
        'kit_api_invalid'
      );
    }
    return tag.id;
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
      throw new MarketingEmailError(
        `Kit API ${method} ${path} failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`,
        `kit_api_${res.status}`
      );
    }
    // 204 No Content
    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
  }
}
