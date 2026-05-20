import { Logger, type LoggerLevel } from './loggerCore.js';

/** Duck-typed observability surface; apps pass their Sentry handle at startup. */
export interface LoggingTelemetry {
  captureException(err: unknown, context?: Record<string, unknown>): void;
  captureMessage(msg: string, level?: 'info' | 'warning' | 'error'): void;
  addBreadcrumb(crumb: {
    message: string;
    category?: string;
    data?: Record<string, unknown>;
  }): void;
}

function exceptionForTelemetry(args: unknown[]): unknown {
  const err = args.find((arg): arg is Error => arg instanceof Error);
  if (err) {
    return err;
  }
  return new Error(String(args[0] ?? ''));
}

function bridgeLogLevelToTelemetry(
  telemetry: LoggingTelemetry,
  level: LoggerLevel,
  args: unknown[]
): void {
  const message = String(args[0] ?? '');

  switch (level) {
    case 'error':
      telemetry.captureException(exceptionForTelemetry(args), {
        extra: { args },
      });
      break;
    case 'warn':
      telemetry.captureMessage(message, 'warning');
      break;
    case 'info':
    case 'debug':
      telemetry.addBreadcrumb({
        message,
        category: 'log',
        data: { level, args: args.slice(1) },
      });
      break;
  }
}

/** Wire Logger output to observability (Sentry) when telemetry is available. */
export function setupLogging(telemetry?: LoggingTelemetry): void {
  if (!telemetry) {
    return;
  }

  Logger.setTelemetryHandler((level, args) => {
    bridgeLogLevelToTelemetry(telemetry, level, args);
  });
}
