import { Logger, log } from '@shared/src/utils/logger';

describe('Logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    Logger.setTelemetryHandler(null);
  });

  describe('debug', () => {
    it('should log debug messages in dev environment', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      global.__DEV__ = true;
      Logger.debug('test message', { key: 'value' });
      expect(consoleDebugSpy).toHaveBeenCalledWith('test message', {
        key: 'value',
      });
    });

    it('should not log debug messages in production', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      global.__DEV__ = false;
      Logger.debug('test message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should call telemetry handler for debug messages in dev', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      global.__DEV__ = true;
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.debug('test message');
      expect(telemetryHandler).toHaveBeenCalledWith('debug', ['test message']);
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      Logger.info('info message', { data: 123 });
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message', {
        data: 123,
      });
    });

    it('should call telemetry handler for info messages', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.info('info message');
      expect(telemetryHandler).toHaveBeenCalledWith('info', ['info message']);
    });
  });

  describe('warn', () => {
    it('should log warn messages', () => {
      Logger.warn('warning message', 'extra arg');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'warning message',
        'extra arg'
      );
    });

    it('should call telemetry handler for warn messages', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.warn('warning message');
      expect(telemetryHandler).toHaveBeenCalledWith('warn', [
        'warning message',
      ]);
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('test error');
      Logger.error('error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message', error);
    });

    it('should call telemetry handler for error messages', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.error('error message');
      expect(telemetryHandler).toHaveBeenCalledWith('error', ['error message']);
    });
  });

  describe('setTelemetryHandler', () => {
    it('should set and use telemetry handler', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.info('test');
      expect(telemetryHandler).toHaveBeenCalledWith('info', ['test']);
    });

    it('should allow removing telemetry handler by passing null', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.setTelemetryHandler(null);
      Logger.info('test');
      expect(telemetryHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple log calls with telemetry handler', () => {
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.info('info1');
      Logger.warn('warn1');
      Logger.error('error1');
      expect(telemetryHandler).toHaveBeenCalledTimes(3);
      expect(telemetryHandler).toHaveBeenNthCalledWith(1, 'info', ['info1']);
      expect(telemetryHandler).toHaveBeenNthCalledWith(2, 'warn', ['warn1']);
      expect(telemetryHandler).toHaveBeenNthCalledWith(3, 'error', ['error1']);
    });
  });

  describe('environment detection', () => {
    it('should detect dev environment from __DEV__', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      global.__DEV__ = true;
      Logger.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should detect production from NODE_ENV', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete global.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      Logger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect development from NODE_ENV', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete global.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      Logger.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false when __DEV__ and NODE_ENV are both undefined', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete global.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      const originalProcess = (globalThis as any).process;

      // Delete NODE_ENV if it exists
      if (process.env.NODE_ENV !== undefined) {
        delete process.env.NODE_ENV;
      }
      // Mock globalThis.process to be undefined
      delete (globalThis as any).process;

      Logger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      // Restore process first, then NODE_ENV
      if (originalProcess !== undefined) {
        (globalThis as any).process = originalProcess;
      }
      if (originalEnv !== undefined && (globalThis as any).process) {
        (globalThis as any).process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('default case handling', () => {
    it('should handle unknown log level with default case', () => {
      // Test the default case by calling log() directly with an invalid level
      // We use type assertion to bypass TypeScript's type checking for this test
      const telemetryHandler = jest.fn();
      Logger.setTelemetryHandler(telemetryHandler);

      // Clear spies to get fresh counts
      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();
      telemetryHandler.mockClear();

      // Call log with an invalid level to trigger the default case
      // @ts-expect-error - intentionally passing invalid level to test default case
      log('invalid-level' as any, ['test message']);

      // Default case should call console.debug and forward to telemetry as 'debug'
      expect(consoleDebugSpy).toHaveBeenCalledWith('test message');
      expect(telemetryHandler).toHaveBeenCalledWith('debug', ['test message']);
    });
  });
});
