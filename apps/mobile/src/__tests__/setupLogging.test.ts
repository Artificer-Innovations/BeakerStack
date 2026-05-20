import { Logger } from '@beakerstack/logger';
import { setupLogging, type LoggingTelemetry } from '../setupLogging';

function createTelemetry(): LoggingTelemetry {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
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
    const setHandler = jest.spyOn(Logger, 'setTelemetryHandler');
    setupLogging();
    expect(setHandler).not.toHaveBeenCalled();
    setHandler.mockRestore();
  });

  it('bridges error logs to captureException using the Error in args', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    const err = new Error('boom');
    Logger.error('mobile failed', err);
    expect(telemetry.captureException).toHaveBeenCalledWith(err, {
      extra: { args: ['mobile failed', err] },
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
  });

  it('bridges warn logs to captureMessage with warning level', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.warn('offline');
    expect(telemetry.captureMessage).toHaveBeenCalledWith('offline', 'warning');
  });

  it('bridges info logs to breadcrumbs', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.info('session started', { id: 's1' });
    expect(telemetry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'session started',
      category: 'log',
      data: { level: 'info', args: [{ id: 's1' }] },
    });
  });

  it('bridges debug logs to breadcrumbs', () => {
    const telemetry = createTelemetry();
    setupLogging(telemetry);
    Logger.debug('retry', 2);
    expect(telemetry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'retry',
      category: 'log',
      data: { level: 'debug', args: [2] },
    });
  });
});
