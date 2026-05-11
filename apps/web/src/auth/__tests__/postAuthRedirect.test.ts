import { describe, expect, it } from 'vitest';
import {
  parseStoredPostAuthRedirect,
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
    expect(
      validateInternalPostAuthPath('//evil.com/path', ORIGIN)
    ).toBeNull();
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
});
