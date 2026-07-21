import { describe, it, expect, vi, beforeEach } from 'vitest';

const plausibleTrack = vi.fn();

vi.mock('@plausible-analytics/tracker', () => ({
  init: vi.fn(),
  track: (...args: unknown[]) => plausibleTrack(...args),
}));

import { trackPageview } from '../track.web.js';

describe('trackPageview', () => {
  beforeEach(() => {
    plausibleTrack.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://getskein.ai',
        href: 'https://getskein.ai/dashboard',
        pathname: '/dashboard',
        search: '',
      },
    });
  });

  it('tracks pageview with current location href by default', () => {
    trackPageview({ domain: 'getskein.ai' });
    expect(plausibleTrack).toHaveBeenCalledWith('pageview', {
      url: 'https://getskein.ai/dashboard',
    });
  });

  it('uses path override as absolute URL on current origin', () => {
    trackPageview({ domain: 'getskein.ai' }, '/pr-42/settings');
    expect(plausibleTrack).toHaveBeenCalledWith('pageview', {
      url: 'https://getskein.ai/pr-42/settings',
    });
  });

  it('passes through absolute URL overrides', () => {
    trackPageview(
      { domain: 'getskein.ai' },
      'https://staging.getskein.ai/pr-42/settings?tab=1'
    );
    expect(plausibleTrack).toHaveBeenCalledWith('pageview', {
      url: 'https://staging.getskein.ai/pr-42/settings?tab=1',
    });
  });

  it('skips excluded admin paths', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://getskein.ai',
        href: 'https://getskein.ai/admin/waitlist',
        pathname: '/admin/waitlist',
        search: '',
      },
    });
    trackPageview({ domain: 'getskein.ai' });
    expect(plausibleTrack).not.toHaveBeenCalled();
  });

  it('respects custom excludePaths', () => {
    trackPageview(
      { domain: 'getskein.ai', excludePaths: ['/internal'] },
      '/internal/reports'
    );
    expect(plausibleTrack).not.toHaveBeenCalled();
  });

  it('no-ops when domain is unset', () => {
    trackPageview({});
    expect(plausibleTrack).not.toHaveBeenCalled();
  });
});
