declare const __DEV__: boolean | undefined;

type LogArgs = Array<unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let telemetryHandler: ((level: LogLevel, args: LogArgs) => void) | null = null;

/** Distinguishes "tests did not override global ref" from an explicit `undefined` override. */
const globalRefUnset = Symbol('globalRefUnset');
let globalRefOverride: typeof globalThis | undefined | symbol = globalRefUnset;

/** @internal Override global ref for unit tests only. */
export function setGlobalRefForTests(ref: typeof globalThis | undefined): void {
  globalRefOverride = ref;
}

/** @internal Reset global ref override after unit tests. */
export function resetGlobalRefForTests(): void {
  globalRefOverride = globalRefUnset;
}

function getGlobalRef(): typeof globalThis | undefined {
  if (globalRefOverride !== globalRefUnset) {
    return globalRefOverride as typeof globalThis | undefined;
  }

  return globalThis;
}

const isDevEnvironment = (): boolean => {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }

  const globalRef = getGlobalRef();
  const maybeProcess =
    globalRef !== undefined
      ? (
          globalRef as {
            process?: { env?: Record<string, string | undefined> };
          }
        ).process
      : undefined;

  if (maybeProcess?.env?.['NODE_ENV']) {
    return maybeProcess.env['NODE_ENV'] !== 'production';
  }

  return false;
};

const forwardToTelemetry = (level: LogLevel, args: LogArgs) => {
  if (telemetryHandler) {
    telemetryHandler(level, args);
  }
};

// Export for testing purposes only
export const log = (level: LogLevel, args: LogArgs) => {
  switch (level) {
    case 'debug':
      if (isDevEnvironment()) {
        console.debug(...args);
        forwardToTelemetry(level, args);
      }
      break;
    case 'info':
      console.info(...args);
      forwardToTelemetry(level, args);
      break;
    case 'warn':
      console.warn(...args);
      forwardToTelemetry(level, args);
      break;
    case 'error':
      console.error(...args);
      forwardToTelemetry(level, args);
      break;
    default:
      console.debug(...args);
      forwardToTelemetry('debug', args);
  }
};

export const Logger = {
  debug: (...args: LogArgs) => {
    log('debug', args);
  },
  info: (...args: LogArgs) => {
    log('info', args);
  },
  warn: (...args: LogArgs) => {
    log('warn', args);
  },
  error: (...args: LogArgs) => {
    log('error', args);
  },
  setTelemetryHandler: (
    handler: ((level: LogLevel, args: LogArgs) => void) | null
  ) => {
    telemetryHandler = handler;
  },
};

export type LoggerLevel = LogLevel;
