import { describe, it, expect, vi, afterEach } from 'vitest';
import { KitAdapter } from '../adapters/kit/kitAdapter.js';
import { MarketingEmailError } from '../errors.js';

const config = { formId: 'form-1', namespace: 'acme' };
const apiKey = 'test-key';

function makeAdapter() {
  return new KitAdapter(config, apiKey);
}

function mockFetch(...responses: Array<{ status: number; body?: unknown }>) {
  let call = 0;
  vi.stubGlobal('fetch', vi.fn(async () => {
    const r = responses[call] ?? responses[responses.length - 1];
    call++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: r.status === 200 ? 'OK' : 'Error',
      json: async () => r.body ?? {},
      text: async () => JSON.stringify(r.body ?? {}),
    };
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KitAdapter.subscribeUser', () => {
  it('POSTs to /forms/{formId}/subscribers then applies each tag', async () => {
    mockFetch(
      { status: 201, body: {} },                           // subscribe
      { status: 200, body: { tags: [] } },                  // findTag for 'acme:signup'
      { status: 201, body: { tag: { id: 'tag-1' } } },      // createTag
      { status: 201, body: {} },                            // applyTag subscriber
    );
    const adapter = makeAdapter();
    await adapter.subscribeUser('user@example.com', ['acme:signup']);
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][0]).toContain('/forms/form-1/subscribers');
    expect(calls[0][1]?.method).toBe('POST');
  });
});

describe('KitAdapter.applyTag', () => {
  it('finds existing tag and POSTs to /tags/{id}/subscribers', async () => {
    mockFetch(
      { status: 200, body: { tags: [{ id: 'tag-42', name: 'acme:signup' }] } },
      { status: 201, body: {} },
    );
    const adapter = makeAdapter();
    await adapter.applyTag('user@example.com', 'acme:signup');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[1][0]).toContain('/tags/tag-42/subscribers');
  });

  it('creates tag when not found, then applies', async () => {
    mockFetch(
      { status: 200, body: { tags: [] } },
      { status: 201, body: { tag: { id: 'new-tag' } } },
      { status: 201, body: {} },
    );
    const adapter = makeAdapter();
    await adapter.applyTag('user@example.com', 'new-tag-name');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[2][0]).toContain('/tags/new-tag/subscribers');
  });
});

describe('KitAdapter.removeTag', () => {
  it('skips DELETE if tag not found', async () => {
    mockFetch({ status: 200, body: { tags: [] } });
    const adapter = makeAdapter();
    await adapter.removeTag('user@example.com', 'ghost-tag');
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it('DELETEs subscriber tag if found', async () => {
    mockFetch(
      { status: 200, body: { tags: [{ id: 'tag-7', name: 'acme:churned' }] } },
      { status: 204 },
    );
    const adapter = makeAdapter();
    await adapter.removeTag('user@example.com', 'acme:churned');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[1][0]).toContain('/subscribers/');
    expect(calls[1][0]).toContain('/tags/tag-7');
    expect(calls[1][1]?.method).toBe('DELETE');
  });
});

describe('KitAdapter.deleteUser', () => {
  it('DELETEs the subscriber', async () => {
    mockFetch({ status: 204 });
    const adapter = makeAdapter();
    await adapter.deleteUser('user@example.com');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][0]).toContain('/subscribers/');
    expect(calls[0][1]?.method).toBe('DELETE');
  });
});

describe('KitAdapter error handling', () => {
  it('throws MarketingEmailError on non-2xx response', async () => {
    mockFetch({ status: 422, body: { message: 'Unprocessable' } });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('bad@example.com')).rejects.toBeInstanceOf(MarketingEmailError);
  });

  it('error code includes the HTTP status', async () => {
    mockFetch({ status: 401, body: {} });
    const adapter = makeAdapter();
    try {
      await adapter.deleteUser('x@x.com');
    } catch (e) {
      expect((e as MarketingEmailError).code).toBe('kit_api_401');
    }
  });

  it('204 response returns empty object', async () => {
    mockFetch({ status: 204 });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('user@example.com')).resolves.toBeUndefined();
  });
});
