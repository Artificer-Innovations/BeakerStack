import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  log,
  resetGlobalRefForTests,
  setGlobalRefForTests,
} from './index';

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalDev: boolean | undefined;
  let originalNodeEnv: string | undefined;
  let originalProcess: unknown;

  beforeEach(() => {
    originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    originalNodeEnv = process.env.NODE_ENV;
    originalProcess = (globalThis as { process?: unknown }).process;

    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    Logger.setTelemetryHandler(null);
    resetGlobalRefForTests();

    if (originalDev === undefined) {
      delete (globalThis as { __DEV__?: boolean }).__DEV__;
    } else {
      (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalProcess === undefined) {
      delete (globalThis as { process?: unknown }).process;
    } else {
      (globalThis as { process?: unknown }).process = originalProcess;
    }
  });

  describe('debug', () => {
    it('should log debug messages in dev environment', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      globalThis.__DEV__ = true;
      Logger.debug('test message', { key: 'value' });
      expect(consoleDebugSpy).toHaveBeenCalledWith('test message', {
        key: 'value',
      });
    });

    it('should not log debug messages in production', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      globalThis.__DEV__ = false;
      Logger.debug('test message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not forward debug telemetry in production', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      globalThis.__DEV__ = false;
      const telemetryHandler = vi.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.debug('test message');
      expect(telemetryHandler).not.toHaveBeenCalled();
    });

    it('should call telemetry handler for debug messages in dev', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      globalThis.__DEV__ = true;
      const telemetryHandler = vi.fn();
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
      const telemetryHandler = vi.fn();
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
      const telemetryHandler = vi.fn();
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
      const telemetryHandler = vi.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.error('error message');
      expect(telemetryHandler).toHaveBeenCalledWith('error', ['error message']);
    });
  });

  describe('setTelemetryHandler', () => {
    it('should set and use telemetry handler', () => {
      const telemetryHandler = vi.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.info('test');
      expect(telemetryHandler).toHaveBeenCalledWith('info', ['test']);
    });

    it('should allow removing telemetry handler by passing null', () => {
      const telemetryHandler = vi.fn();
      Logger.setTelemetryHandler(telemetryHandler);
      Logger.setTelemetryHandler(null);
      Logger.info('test');
      expect(telemetryHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple log calls with telemetry handler', () => {
      const telemetryHandler = vi.fn();
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
      globalThis.__DEV__ = true;
      Logger.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should detect production from NODE_ENV', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete globalThis.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      Logger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect development from NODE_ENV', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete globalThis.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      Logger.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('uses process.env.NODE_ENV when __DEV__ is undefined and process exists', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete globalThis.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      Logger.debug('env branch');
      expect(consoleDebugSpy).toHaveBeenCalledWith('env branch');
      process.env.NODE_ENV = originalEnv;
    });

    it('should treat missing global ref as non-dev', () => {
      setGlobalRefForTests(undefined);
      Logger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should return false when __DEV__ and NODE_ENV are both undefined', () => {
      // @ts-expect-error - accessing private __DEV__ for testing
      delete globalThis.__DEV__;
      const originalEnv = process.env.NODE_ENV;
      const originalProcess = (globalThis as { process?: unknown }).process;

      if (process.env.NODE_ENV !== undefined) {
        delete process.env.NODE_ENV;
      }
      delete (globalThis as { process?: unknown }).process;

      Logger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      if (originalProcess !== undefined) {
        (globalThis as { process?: unknown }).process = originalProcess;
      }
      if (
        originalEnv !== undefined &&
        (globalThis as { process?: unknown }).process
      ) {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('default case handling', () => {
    it('should handle unknown log level with default case', () => {
      const telemetryHandler = vi.fn();
      Logger.setTelemetryHandler(telemetryHandler);

      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();
      telemetryHandler.mockClear();

      // @ts-expect-error - intentionally passing invalid level to test default case
      log('invalid-level' as never, ['test message']);

      expect(consoleDebugSpy).toHaveBeenCalledWith('test message');
      expect(telemetryHandler).toHaveBeenCalledWith('debug', ['test message']);
    });
  });
});
