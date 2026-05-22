export interface ObservabilityExporter {
  type: 'sentry' | 'otlp';
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface ObservabilitySampling {
  traces?: number;
  replayOnError?: number;
  replay?: number;
}

export interface ObservabilityPii {
  captureUserEmail?: boolean;
  captureIp?: boolean;
  captureRequestBodies?: boolean;
}

export interface ObservabilityConfig {
  project: string;
  environment: string;
  release?: string;
  dsn?: string;
  exporter?: ObservabilityExporter;
  sampling?: ObservabilitySampling;
  pii?: ObservabilityPii;
}

export interface ObservabilityHandle {
  captureException(err: unknown, context?: Record<string, unknown>): void;
  captureMessage(msg: string, level?: 'info' | 'warning' | 'error'): void;
  setUser(id: string | null): void;
  addBreadcrumb(crumb: {
    message: string;
    category?: string;
    data?: Record<string, unknown>;
  }): void;
  withScope<T>(fn: (scope: unknown) => T): T;
  startSpan<T>(name: string, fn: () => T): T;
}
