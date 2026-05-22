import { describe, it, expect, vi, afterEach } from 'vitest';
import { KitAdapter, isPermanentKitError } from '../adapters/kit/kitAdapter.js';
import { MarketingEmailError } from '../errors.js';

const config = { formId: 'form-1', namespace: 'acme' };
const apiKey = 'test-key';

function makeAdapter() {
  return new KitAdapter(config, apiKey);
}

type MockResponse = {
  status: number;
  body?: unknown;
  text?: string | (() => Promise<string>);
};

function mockFetch(...responses: Array<MockResponse>) {
  let call = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const r = responses[call] ?? responses[responses.length - 1];
      call++;
      const textFn =
        typeof r.text === 'function'
          ? r.text
          : async () =>
              typeof r.text === 'string'
                ? r.text
                : JSON.stringify(r.body ?? {});
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        statusText: r.status === 200 ? 'OK' : 'Error',
        json: async () => r.body ?? {},
        text: textFn,
      };
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KitAdapter.subscribeUser', () => {
  it('POSTs to /forms/{formId}/subscribers then applies each tag', async () => {
    mockFetch(
      { status: 201, body: {} }, // subscribe
      { status: 200, body: { tags: [{ id: 'tag-1', name: 'acme:signup' }] } }, // findTag
      { status: 201, body: {} } // applyTag subscriber
    );
    const adapter = makeAdapter();
    await adapter.subscribeUser('user@example.com', ['acme:signup']);
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][0]).toContain('/forms/form-1/subscribers');
    expect(calls[0][1]?.method).toBe('POST');
  });

  it('skips tag application when tags array is empty', async () => {
    mockFetch({ status: 201, body: {} });
    const adapter = makeAdapter();
    await adapter.subscribeUser('user@example.com', []);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });
});

describe('KitAdapter.applyTag', () => {
  it('finds existing tag and POSTs to /tags/{id}/subscribers', async () => {
    mockFetch(
      { status: 200, body: { tags: [{ id: 'tag-42', name: 'acme:signup' }] } },
      { status: 201, body: {} }
    );
    const adapter = makeAdapter();
    await adapter.applyTag('user@example.com', 'acme:signup');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[1][0]).toContain('/tags/tag-42/subscribers');
  });

  it('throws kit_tag_not_found when tag does not exist in Kit', async () => {
    mockFetch({ status: 200, body: { tags: [] } });
    const adapter = makeAdapter();
    await expect(
      adapter.applyTag('user@example.com', 'acme:missing')
    ).rejects.toMatchObject({ code: 'kit_tag_not_found' });
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
      { status: 204 }
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
  it('looks up subscriber by email then DELETEs by id', async () => {
    mockFetch(
      { status: 200, body: { subscribers: [{ id: 'sub-99' }] } }, // lookup
      { status: 204 } // delete
    );
    const adapter = makeAdapter();
    await adapter.deleteUser('user@example.com');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][0]).toContain('/subscribers?email_address=');
    expect(calls[1][0]).toContain('/subscribers/sub-99');
    expect(calls[1][1]?.method).toBe('DELETE');
  });

  it('is idempotent — returns without deleting when subscriber not found', async () => {
    mockFetch({ status: 200, body: { subscribers: [] } });
    const adapter = makeAdapter();
    await expect(
      adapter.deleteUser('gone@example.com')
    ).resolves.toBeUndefined();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it('treats non-array subscribers payload as empty', async () => {
    mockFetch({ status: 200, body: { subscribers: null } });
    const adapter = makeAdapter();
    await expect(
      adapter.deleteUser('gone@example.com')
    ).resolves.toBeUndefined();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it('resolves to undefined on successful 204 delete', async () => {
    mockFetch(
      { status: 200, body: { subscribers: [{ id: 'sub-1' }] } },
      { status: 204 }
    );
    const adapter = makeAdapter();
    await expect(
      adapter.deleteUser('user@example.com')
    ).resolves.toBeUndefined();
  });
});

describe('KitAdapter error handling', () => {
  it('throws MarketingEmailError on non-2xx response', async () => {
    mockFetch({ status: 422, body: { message: 'Unprocessable' } });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('bad@example.com')).rejects.toBeInstanceOf(
      MarketingEmailError
    );
  });

  it('error code includes the HTTP status', async () => {
    mockFetch({ status: 401, body: {} });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('x@x.com')).rejects.toMatchObject({
      code: 'kit_api_401',
    });
  });

  it('includes response body in error message when present', async () => {
    mockFetch({ status: 500, body: { message: 'Server exploded' } });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('x@x.com')).rejects.toMatchObject({
      message: expect.stringContaining('Server exploded'),
    });
  });

  it('truncates long error body to 200 chars', async () => {
    const longBody = 'x'.repeat(300);
    mockFetch({ status: 500, text: longBody });
    const adapter = makeAdapter();
    try {
      await adapter.deleteUser('x@x.com');
    } catch (e) {
      expect((e as MarketingEmailError).message).toContain('x'.repeat(200));
      expect((e as MarketingEmailError).message).not.toContain('x'.repeat(201));
    }
  });
});

describe('KitAdapter.findTag', () => {
  it('returns null when API tags do not match the requested name', async () => {
    mockFetch({
      status: 200,
      body: { tags: [{ id: 'tag-1', name: 'other-tag' }] },
    });
    const adapter = makeAdapter();
    await adapter.removeTag('user@example.com', 'missing-tag');
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it('treats missing tags array as empty', async () => {
    mockFetch({ status: 200, body: {} });
    const adapter = makeAdapter();
    await adapter.removeTag('user@example.com', 'ghost-tag');
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });
});

describe('KitAdapter error message formatting', () => {
  it('omits body suffix when error response text is empty', async () => {
    mockFetch({ status: 500, text: '' });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('x@x.com')).rejects.toMatchObject({
      message:
        'Kit API GET /subscribers?email_address=x%40x.com failed: 500 Error',
    });
  });

  it('uses empty string when res.text() rejects', async () => {
    mockFetch({
      status: 502,
      text: async () => {
        throw new Error('read failed');
      },
    });
    const adapter = makeAdapter();
    await expect(adapter.deleteUser('x@x.com')).rejects.toMatchObject({
      message:
        'Kit API GET /subscribers?email_address=x%40x.com failed: 502 Error',
    });
  });
});

describe('isPermanentKitError', () => {
  it('returns true for permanent HTTP status codes', () => {
    expect(isPermanentKitError('kit_api_400')).toBe(true);
    expect(isPermanentKitError('kit_api_404')).toBe(true);
    expect(isPermanentKitError('kit_api_422')).toBe(true);
  });

  it('returns true for kit_tag_not_found', () => {
    expect(isPermanentKitError('kit_tag_not_found')).toBe(true);
  });

  it('returns false for transient codes', () => {
    expect(isPermanentKitError('kit_api_500')).toBe(false);
    expect(isPermanentKitError('kit_api_429')).toBe(false);
    expect(isPermanentKitError('kit_api_503')).toBe(false);
  });
});
