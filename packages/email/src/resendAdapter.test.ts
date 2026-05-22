import { describe, it, expect, vi, afterEach } from 'vitest';
import { createResendEmailAdapter, EmailSendError } from './resendAdapter.js';

const API_KEY = 'test-key';
const FROM = 'from@example.com';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createResendEmailAdapter', () => {
  it('POSTs the correct request shape', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'abc' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = createResendEmailAdapter({ apiKey: API_KEY, from: FROM });
    await adapter.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${API_KEY}`
    );
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      from: FROM,
      to: ['user@example.com'],
      subject: 'Hello',
      html: '<p>Hi</p>',
    });
  });

  it('includes text field when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = createResendEmailAdapter({ apiKey: API_KEY, from: FROM });
    await adapter.send({
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body.text).toBe('Hi');
  });

  it('omits text field when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = createResendEmailAdapter({ apiKey: API_KEY, from: FROM });
    await adapter.send({
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body).not.toHaveProperty('text');
  });

  it('throws EmailSendError on non-2xx with status and parsed body', async () => {
    const errorBody = { name: 'invalid_api_key', message: 'Invalid API key' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => errorBody,
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = createResendEmailAdapter({ apiKey: API_KEY, from: FROM });
    let thrown: unknown;
    try {
      await adapter.send({
        to: 'user@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(EmailSendError);
    expect((thrown as EmailSendError).status).toBe(403);
    expect((thrown as EmailSendError).body).toEqual(errorBody);
    expect((thrown as EmailSendError).message).toContain('403');
  });

  it('falls back to text body when Resend returns non-JSON error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = createResendEmailAdapter({ apiKey: API_KEY, from: FROM });
    let thrown: unknown;
    try {
      await adapter.send({
        to: 'user@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(EmailSendError);
    expect((thrown as EmailSendError).status).toBe(500);
    expect((thrown as EmailSendError).body).toBe('Internal Server Error');
  });
});
