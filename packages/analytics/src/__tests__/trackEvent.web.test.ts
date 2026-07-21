import { describe, it, expect, vi, beforeEach } from 'vitest';

const plausibleTrack = vi.fn();

vi.mock('@plausible-analytics/tracker', () => ({
  init: vi.fn(),
  track: (...args: unknown[]) => plausibleTrack(...args),
}));

import { trackEvent } from '../trackEvent.web.js';

describe('trackEvent', () => {
  beforeEach(() => {
    plausibleTrack.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://getskein.ai',
        href: 'https://getskein.ai/signup',
        pathname: '/signup',
        search: '',
      },
    });
  });

  it('tracks custom events with props', () => {
    trackEvent({ domain: 'getskein.ai' }, 'signup_completed', {
      signup_channel: 'open',
      is_new_account: true,
    });
    expect(plausibleTrack).toHaveBeenCalledWith('signup_completed', {
      props: { signup_channel: 'open', is_new_account: 'true' },
    });
  });

  it('tracks custom events without props', () => {
    trackEvent({ domain: 'getskein.ai' }, 'wizard_viewed');
    expect(plausibleTrack).toHaveBeenCalledWith('wizard_viewed', {});
  });

  it('skips excluded admin paths', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://getskein.ai',
        href: 'https://getskein.ai/admin/users',
        pathname: '/admin/users',
        search: '',
      },
    });
    trackEvent({ domain: 'getskein.ai' }, 'signup_completed');
    expect(plausibleTrack).not.toHaveBeenCalled();
  });

  it('no-ops when domain is unset', () => {
    trackEvent({}, 'signup_completed');
    expect(plausibleTrack).not.toHaveBeenCalled();
  });

  it('no-ops when window is unavailable', () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal('window', undefined);
    trackEvent({ domain: 'getskein.ai' }, 'signup_completed');
    expect(plausibleTrack).not.toHaveBeenCalled();
    vi.stubGlobal('window', originalWindow);
  });
});
