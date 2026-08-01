import { describe, it, expect, vi, beforeEach } from 'vitest';

const plausibleInit = vi.fn();

vi.mock('@plausible-analytics/tracker', () => ({
  init: (...args: unknown[]) => plausibleInit(...args),
  track: vi.fn(),
}));

import { initAnalytics } from '../init.web.js';
import {
  isAnalyticsInitialized,
  resetAnalyticsInitStateForTests,
} from '../testing.js';

describe('initAnalytics', () => {
  beforeEach(() => {
    plausibleInit.mockClear();
    resetAnalyticsInitStateForTests();
  });

  it('initializes plausible once with domain and transformRequest', () => {
    initAnalytics({ domain: 'getskein.ai' });

    expect(plausibleInit).toHaveBeenCalledTimes(1);
    expect(plausibleInit).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'getskein.ai',
        autoCapturePageviews: true,
        logging: false,
        transformRequest: expect.any(Function),
      })
    );
    expect(isAnalyticsInitialized()).toBe(true);
  });

  it('passes endpoint and captureOnLocalhost when configured', () => {
    initAnalytics({
      domain: 'getskein.ai',
      endpoint: 'https://plausible.io/api/event',
      captureOnLocalhost: true,
    });

    expect(plausibleInit).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://plausible.io/api/event',
        captureOnLocalhost: true,
      })
    );
  });

  it('does not initialize twice', () => {
    initAnalytics({ domain: 'getskein.ai' });
    initAnalytics({ domain: 'getskein.ai' });
    expect(plausibleInit).toHaveBeenCalledTimes(1);
  });

  it('no-ops when domain is unset', () => {
    initAnalytics({});
    expect(plausibleInit).not.toHaveBeenCalled();
    expect(isAnalyticsInitialized()).toBe(false);
  });

  it('no-ops when window is undefined', () => {
    const win = globalThis.window;
    // @ts-expect-error SSR guard test
    delete globalThis.window;
    initAnalytics({ domain: 'getskein.ai' });
    expect(plausibleInit).not.toHaveBeenCalled();
    globalThis.window = win;
  });
});
