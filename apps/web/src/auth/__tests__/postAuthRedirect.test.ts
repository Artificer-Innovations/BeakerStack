import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  parseStoredPostAuthRedirect,
  POST_AUTH_REDIRECT_KEY,
  readAndClearPostAuthRedirect,
  resolvePostAuthDestination,
  serializePostAuthRedirectPayload,
  validateInternalPostAuthPath,
  POST_AUTH_REDIRECT_TTL_MS,
} from '../postAuthRedirect';

const ORIGIN = 'http://localhost:5173';

describe('validateInternalPostAuthPath', () => {
  it('accepts same-origin path + search', () => {
    expect(validateInternalPostAuthPath('/billing/plans?plan=x', ORIGIN)).toBe(
      '/billing/plans?plan=x'
    );
  });

  it('rejects protocol-relative //evil.com', () => {
    expect(validateInternalPostAuthPath('//evil.com/path', ORIGIN)).toBeNull();
  });

  it('rejects https://evil.com path when resolved as absolute', () => {
    expect(
      validateInternalPostAuthPath('https://evil.com/path', ORIGIN)
    ).toBeNull();
  });

  it('rejects bare strings without leading slash', () => {
    expect(validateInternalPostAuthPath('evil.com', ORIGIN)).toBeNull();
  });
});

describe('resolvePostAuthDestination', () => {
  it('returns dashboard when plan missing', () => {
    expect(resolvePostAuthDestination(new URLSearchParams())).toBe(
      '/dashboard'
    );
  });

  it('returns dashboard for unknown plan id', () => {
    expect(
      resolvePostAuthDestination(
        new URLSearchParams({ plan: 'not_a_real_plan_id' })
      )
    ).toBe('/dashboard');
  });

  it('returns dashboard for free tier', () => {
    expect(
      resolvePostAuthDestination(
        new URLSearchParams({ plan: 'beakerstack_free' })
      )
    ).toBe('/dashboard');
  });

  it('returns billing plans with welcome for paid Pro monthly', () => {
    expect(
      resolvePostAuthDestination(
        new URLSearchParams({ plan: 'beakerstack_pro' })
      )
    ).toBe('/billing/plans?plan=beakerstack_pro&welcome=1');
  });

  it('includes cadence=annual when set', () => {
    expect(
      resolvePostAuthDestination(
        new URLSearchParams({ plan: 'beakerstack_max', cadence: 'annual' })
      )
    ).toBe('/billing/plans?plan=beakerstack_max&welcome=1&cadence=annual');
  });
});

describe('parseStoredPostAuthRedirect', () => {
  it('parses valid JSON payload', () => {
    const path = '/billing/plans?plan=beakerstack_pro&welcome=1';
    const raw = serializePostAuthRedirectPayload(path);
    expect(parseStoredPostAuthRedirect(raw, Date.now(), ORIGIN)).toBe(path);
  });

  it('returns null when TTL expired', () => {
    const path = '/billing/plans?plan=beakerstack_pro&welcome=1';
    const raw = JSON.stringify({
      path,
      ts: Date.now() - POST_AUTH_REDIRECT_TTL_MS - 1,
    });
    expect(parseStoredPostAuthRedirect(raw, Date.now(), ORIGIN)).toBeNull();
  });

  it('returns null for invalid JSON (no legacy raw-path fallback)', () => {
    expect(
      parseStoredPostAuthRedirect('not-json', Date.now(), ORIGIN)
    ).toBeNull();
  });
});

function storageMock(store: Record<string, string>) {
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
}

describe('readAndClearPostAuthRedirect', () => {
  let memS: Record<string, string>;
  let memL: Record<string, string>;

  beforeEach(() => {
    memS = {};
    memL = {};
    vi.stubGlobal('sessionStorage', storageMock(memS));
    vi.stubGlobal('localStorage', storageMock(memL));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns validated path and clears both stores', () => {
    const path = '/billing/plans?plan=beakerstack_pro&welcome=1';
    memS[POST_AUTH_REDIRECT_KEY] = serializePostAuthRedirectPayload(path);
    expect(readAndClearPostAuthRedirect()).toBe(path);
    expect(memS[POST_AUTH_REDIRECT_KEY]).toBeUndefined();
    expect(memL[POST_AUTH_REDIRECT_KEY]).toBeUndefined();
  });

  it('uses sessionStorage when both are set', () => {
    const a = '/billing/plans?plan=beakerstack_pro&welcome=1';
    const b = '/dashboard';
    memS[POST_AUTH_REDIRECT_KEY] = serializePostAuthRedirectPayload(a);
    memL[POST_AUTH_REDIRECT_KEY] = serializePostAuthRedirectPayload(b);
    expect(readAndClearPostAuthRedirect()).toBe(a);
  });
});
