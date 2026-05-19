import React, { useMemo } from 'react';
import type { ObservabilityConfig, ObservabilityHandle } from '../types.js';
import { ObservabilityContext } from '../context.js';
import { hashUserId, scrubEmail } from '../pii.js';

// Module-level Sentry reference — dynamic import is intercepted by vi.mock in tests.
const Sentry = await import('@sentry/react').catch(() => null) as typeof import('@sentry/react') | null;

interface Props {
  config: ObservabilityConfig;
  children: React.ReactNode;
}

export function ObservabilityProvider({ config, children }: Props) {
  const handle = useMemo<ObservabilityHandle>(() => {
    return {
      captureException(err, context) {
        Sentry?.captureException(err, context ? { extra: context } : undefined);
      },
      captureMessage(msg, level = 'info') {
        Sentry?.captureMessage(msg, level);
      },
      setUser(id) {
        if (id === null) {
          Sentry?.setUser(null);
        } else {
          Sentry?.setUser({ id: hashUserId(id) });
        }
      },
      addBreadcrumb(crumb) {
        Sentry?.addBreadcrumb({
          ...crumb,
          message: scrubEmail(crumb.message),
        });
      },
      withScope(fn) {
        if (!Sentry) return fn(null);
        let result!: ReturnType<typeof fn>;
        Sentry.withScope((scope) => {
          result = fn(scope);
        });
        return result;
      },
      startSpan<T>(name: string, fn: () => T): T {
        if (!Sentry) return fn();
        let result!: T;
        Sentry.startSpan({ name }, () => {
          result = fn();
        });
        return result;
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.project, config.environment]);

  return (
    <ObservabilityContext.Provider value={handle}>
      {children}
    </ObservabilityContext.Provider>
  );
}
