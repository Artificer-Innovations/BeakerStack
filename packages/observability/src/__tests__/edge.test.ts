import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initEdgeObservability, withEdgeScope, resetForTesting } from '../init.edge.js';
import { setupLogging } from '@beakerstack/logger';

vi.mock('@beakerstack/logger', () => ({
  setupLogging: vi.fn(),
}));

describe('initEdgeObservability', () => {
  beforeEach(() => {
    resetForTesting();
    vi.clearAllMocks();
  });

  it('validates and initializes on first call', () => {
    expect(() =>
      initEdgeObservability({ project: 'p', environment: 'test' })
    ).not.toThrow();
  });

  it('is idempotent — second call returns early without re-running', () => {
    const config = { project: 'p', environment: 'test' };
    initEdgeObservability(config);
    expect(() => initEdgeObservability(config)).not.toThrow();
  });

  describe('setupLogging telemetry callbacks', () => {
    it('captureException logs to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      initEdgeObservability({ project: 'p', environment: 'test' });
      const telemetry = vi.mocked(setupLogging).mock.calls[0][0];
      const err = new Error('boom');
      telemetry.captureException(err);
      expect(spy).toHaveBeenCalledWith('[edge-observability]', err);
      spy.mockRestore();
    });

    it('captureMessage logs to console.log with given level', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      initEdgeObservability({ project: 'p', environment: 'test' });
      const telemetry = vi.mocked(setupLogging).mock.calls[0][0];
      telemetry.captureMessage('hello', 'warning');
      expect(spy).toHaveBeenCalledWith('[edge-observability:warning]', 'hello');
      spy.mockRestore();
    });

    it('captureMessage defaults level to info when omitted', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      initEdgeObservability({ project: 'p', environment: 'test' });
      const telemetry = vi.mocked(setupLogging).mock.calls[0][0];
      telemetry.captureMessage('hello');
      expect(spy).toHaveBeenCalledWith('[edge-observability:info]', 'hello');
      spy.mockRestore();
    });

    it('addBreadcrumb logs to console.debug with category and message', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      initEdgeObservability({ project: 'p', environment: 'test' });
      const telemetry = vi.mocked(setupLogging).mock.calls[0][0];
      telemetry.addBreadcrumb({ message: 'crumb', category: 'auth' });
      expect(spy).toHaveBeenCalledWith('[edge-observability:breadcrumb]', 'auth', 'crumb');
      spy.mockRestore();
    });

    it('addBreadcrumb uses empty string when category is omitted', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      initEdgeObservability({ project: 'p', environment: 'test' });
      const telemetry = vi.mocked(setupLogging).mock.calls[0][0];
      telemetry.addBreadcrumb({ message: 'crumb' });
      expect(spy).toHaveBeenCalledWith('[edge-observability:breadcrumb]', '', 'crumb');
      spy.mockRestore();
    });
  });
});

describe('withEdgeScope', () => {
  beforeEach(() => resetForTesting());

  it('calls the handler and returns its response', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'));
    const wrapped = withEdgeScope(handler);
    const req = new Request('https://example.com');
    const res = await wrapped(req);
    expect(handler).toHaveBeenCalledWith(req);
    expect(await res.text()).toBe('ok');
  });

  it('calls handler on each invocation', async () => {
    let callCount = 0;
    const handler = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(`call-${callCount}`);
    });
    const wrapped = withEdgeScope(handler);
    const req = new Request('https://example.com');
    await wrapped(req);
    await wrapped(req);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
