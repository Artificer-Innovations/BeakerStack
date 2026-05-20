import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from './loggerCore.js';
import { setupLogging, type LoggingTelemetry } from './setupLogging.js';

function createTelemetry(): LoggingTelemetry {
  return {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
}

describe('setupLogging', () => {
  beforeEach(() => {
    // @ts-expect-error test override
    globalThis.__DEV__ = true;
  });

  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.__DEV__;
    Logger.setTelemetryHandler(null);
  });

  it('does not register a handler when telemetry is omitted', () => {
    const setHandler = vi.spyOn(Logger, 'setTelemetryHandler');
    setupLogging();
    expect(setHandler).not.toHaveBeenCalled();
    setHandler.mockRestore();
  });

  it('bridges error logs to captureException using the Error in args', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    const err = new Error('boom');
    Logger.error('billing failed', err);
    expect(telemetry.captureException).toHaveBeenCalledWith(err, {
      extra: { args: ['billing failed', err] },
    });
  });

  it('bridges error logs when the first argument is an Error', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    const err = new Error('boom');
    Logger.error(err);
    expect(telemetry.captureException).toHaveBeenCalledWith(err, {
      extra: { args: [err] },
    });
  });

  it('synthesizes an Error when error log has no first argument', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.error();
    expect(telemetry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { args: [] },
    });
    const captured = vi.mocked(telemetry.captureException).mock.calls[0]?.[0];
    expect(captured).toBeInstanceOf(Error);
    expect((captured as Error).message).toBe('');
  });

  it('bridges warn logs to captureMessage with warning level', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.warn('rate limited');
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      'rate limited',
      'warning'
    );
  });

  it('bridges info logs to breadcrumbs', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.info('user signed in', { userId: 'u1' });
    expect(telemetry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'user signed in',
      category: 'log',
      data: { level: 'info', args: [{ userId: 'u1' }] },
    });
  });

  it('bridges debug logs to breadcrumbs', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.debug('cache miss', 'key');
    expect(telemetry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'cache miss',
      category: 'log',
      data: { level: 'debug', args: ['key'] },
    });
  });
});
