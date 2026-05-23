const KIT_API_BASE = 'https://api.kit.com/v4';

const PERMANENT_ERROR_CODES = new Set([
  'kit_api_400',
  'kit_api_404',
  'kit_api_422',
  'unknown_event_type',
]);

export function isPermanentKitError(code: string): boolean {
  return PERMANENT_ERROR_CODES.has(code) || code === 'kit_tag_not_found';
}

export function isRateLimitError(code: string): boolean {
  return code === 'kit_api_429';
}

export class KitClientError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'KitClientError';
  }
}

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
    if (!tagId) return;
    const subId = await this.findSubscriberId(email);
    if (!subId) return;
    await this.delete(`/subscribers/${subId}/tags/${tagId}`);
  }

  async unsubscribeUser(email: string): Promise<void> {
    const subId = await this.findSubscriberId(email);
    if (!subId) return;
    await this.post(`/subscribers/${subId}/unsubscribe`, {});
  }

  async deleteUser(email: string): Promise<void> {
    const subId = await this.findSubscriberId(email);
    if (!subId) return;
    await this.delete(`/subscribers/${subId}`);
  }

  private async findTag(name: string): Promise<string | null> {
    const res = await this.get(`/tags?name=${encodeURIComponent(name)}&per_page=1`);
    const tags =
      (res['tags'] as Array<{ id: string; name: string }> | undefined) ?? [];
    return tags.find(t => t.name === name)?.id ?? null;
  }

  private async findSubscriberId(email: string): Promise<string | null> {
    const res = await this.get(
      `/subscribers?email_address=${encodeURIComponent(email)}`
    );
    const subs =
      (res['subscribers'] as Array<{ id: string }> | undefined) ?? [];
    return subs[0]?.id ?? null;
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
      throw new KitClientError(
        `Kit API ${method} ${path} → ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`,
        `kit_api_${res.status}`
      );
    }

    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
  }
}
