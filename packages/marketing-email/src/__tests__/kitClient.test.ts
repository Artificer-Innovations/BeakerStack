import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  KitClient,
  KitClientError,
  isPermanentKitError,
  isRateLimitError,
} from '../adapters/kit/kitClient.js';

function mockResponse(status: number, body?: unknown) {
  const bodyStr = status === 204 ? null : JSON.stringify(body ?? {});
  return Promise.resolve(
    new Response(bodyStr, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('isPermanentKitError', () => {
  it.each([
    'kit_api_400',
    'kit_api_404',
    'kit_api_422',
    'unknown_event_type',
    'kit_tag_not_found',
  ])('returns true for %s', code => {
    expect(isPermanentKitError(code)).toBe(true);
  });

  it.each(['kit_api_429', 'kit_api_500', 'other'])(
    'returns false for %s',
    code => {
      expect(isPermanentKitError(code)).toBe(false);
    }
  );
});

describe('isRateLimitError', () => {
  it('returns true for kit_api_429', () => {
    expect(isRateLimitError('kit_api_429')).toBe(true);
  });

  it('returns false for other codes', () => {
    expect(isRateLimitError('kit_api_400')).toBe(false);
    expect(isRateLimitError('kit_api_500')).toBe(false);
  });
});

describe('KitClientError', () => {
  it('sets name, message, and code', () => {
    const err = new KitClientError('oops', 'kit_api_404');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('KitClientError');
    expect(err.message).toBe('oops');
    expect(err.code).toBe('kit_api_404');
  });
});

describe('KitClient', () => {
  const client = new KitClient('test-api-key');
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('subscribeToForm', () => {
    it('POSTs to the form endpoint', async () => {
      fetchMock.mockReturnValue(mockResponse(200));
      await client.subscribeToForm('user@example.com', 'form-123');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.kit.com/v4/forms/form-123/subscribers',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('sends Authorization header with api key', async () => {
      fetchMock.mockReturnValue(mockResponse(200));
      await client.subscribeToForm('user@example.com', 'form-123');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('throws KitClientError on HTTP error', async () => {
      fetchMock.mockReturnValue(mockResponse(400, {}));
      await expect(client.subscribeToForm('u@e.com', 'f')).rejects.toThrow(
        KitClientError
      );
    });

    it('error code matches HTTP status', async () => {
      fetchMock.mockReturnValue(mockResponse(500, {}));
      const err = await client
        .subscribeToForm('u@e.com', 'f')
        .catch(e => e as KitClientError);
      expect(err.code).toBe('kit_api_500');
    });

    it('omits response body suffix when error body is empty', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve(''),
        } as Response)
      );
      const err = await client
        .subscribeToForm('u@e.com', 'f')
        .catch(e => e as KitClientError);
      expect(err.message).toBe(
        'Kit API POST /forms/f/subscribers → 400 Bad Request'
      );
    });

    it('handles response.text() rejection on HTTP error', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: () => Promise.reject(new Error('body unreadable')),
        } as Response)
      );
      const err = await client
        .subscribeToForm('u@e.com', 'f')
        .catch(e => e as KitClientError);
      expect(err.code).toBe('kit_api_502');
      expect(err.message).toBe(
        'Kit API POST /forms/f/subscribers → 502 Bad Gateway'
      );
    });
  });

  describe('applyTag', () => {
    it('finds tag and applies it', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { tags: [{ id: 'tag-1', name: 'acme:tag' }] })
        )
        .mockReturnValueOnce(mockResponse(200));
      await client.applyTag('user@example.com', 'acme:tag');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws kit_tag_not_found when tag is missing', async () => {
      fetchMock.mockReturnValue(mockResponse(200, { tags: [] }));
      const err = await client
        .applyTag('u@e.com', 'missing')
        .catch(e => e as KitClientError);
      expect(err).toBeInstanceOf(KitClientError);
      expect(err.code).toBe('kit_tag_not_found');
    });

    it('throws kit_tag_not_found when tags field is absent', async () => {
      fetchMock.mockReturnValue(mockResponse(200, {}));
      const err = await client
        .applyTag('u@e.com', 'missing')
        .catch(e => e as KitClientError);
      expect(err.code).toBe('kit_tag_not_found');
    });
  });

  describe('removeTag', () => {
    it('deletes tag subscription from subscriber', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { tags: [{ id: 'tag-1', name: 'acme:tag' }] })
        )
        .mockReturnValueOnce(
          mockResponse(200, { subscribers: [{ id: 'sub-1' }] })
        )
        .mockReturnValueOnce(mockResponse(204));
      await client.removeTag('user@example.com', 'acme:tag');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('returns early when tag is not found', async () => {
      fetchMock.mockReturnValue(mockResponse(200, { tags: [] }));
      await client.removeTag('user@example.com', 'missing');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns early when subscriber is not found', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { tags: [{ id: 'tag-1', name: 'acme:tag' }] })
        )
        .mockReturnValueOnce(mockResponse(200, { subscribers: [] }));
      await client.removeTag('user@example.com', 'acme:tag');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns early when subscribers field is absent', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { tags: [{ id: 'tag-1', name: 'acme:tag' }] })
        )
        .mockReturnValueOnce(mockResponse(200, {}));
      await client.removeTag('user@example.com', 'acme:tag');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('unsubscribeUser', () => {
    it('posts to unsubscribe endpoint', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { subscribers: [{ id: 'sub-1' }] })
        )
        .mockReturnValueOnce(mockResponse(200));
      await client.unsubscribeUser('user@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns early when subscriber not found', async () => {
      fetchMock.mockReturnValue(mockResponse(200, { subscribers: [] }));
      await client.unsubscribeUser('user@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteUser', () => {
    it('deletes the subscriber', async () => {
      fetchMock
        .mockReturnValueOnce(
          mockResponse(200, { subscribers: [{ id: 'sub-1' }] })
        )
        .mockReturnValueOnce(mockResponse(204));
      await client.deleteUser('user@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns early when subscriber not found', async () => {
      fetchMock.mockReturnValue(mockResponse(200, { subscribers: [] }));
      await client.deleteUser('user@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('204 No Content', () => {
    it('returns without throwing for 204', async () => {
      fetchMock.mockReturnValue(mockResponse(204));
      await expect(
        client.subscribeToForm('u@e.com', 'f')
      ).resolves.toBeUndefined();
    });
  });
});
