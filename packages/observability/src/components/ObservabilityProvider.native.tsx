/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import type { ObservabilityConfig, ObservabilityHandle } from '../types.js';
import { ObservabilityContext } from '../context.js';
import { hashUserId, scrubEmail } from '../pii.js';

// Module-level Sentry reference — dynamic import is intercepted by vi.mock in tests.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: optional peer dep — not installed in type-check environments
const Sentry = await import('@sentry/react-native').catch(() => null) as any;

interface Props {
  config: ObservabilityConfig;
  children: React.ReactNode;
  navigationRef?: React.RefObject<unknown>;
}

export function ObservabilityProvider({ config, children, navigationRef }: Props) {
  const handle = useMemo<ObservabilityHandle>(() => {
    if (Sentry && navigationRef) {
      try {
        const instrumentation = (Sentry as any).reactNavigationInstrumentation;
        if (instrumentation && navigationRef.current) {
          instrumentation.registerNavigationContainer(navigationRef);
        }
      } catch {
        // instrumentation not available
      }
    }

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
        Sentry.withScope((scope: unknown) => {
          result = fn(scope);
        });
        return result;
      },
      startSpan<T>(name: string, fn: () => T): T {
        if (!Sentry) return fn();
        let result!: T;
        (Sentry as any).startSpan({ name }, () => {
          result = fn();
        });
        return result;
      },
    };
  }, [config.project, config.environment, navigationRef]);

  return (
    <ObservabilityContext.Provider value={handle}>
      {children}
    </ObservabilityContext.Provider>
  );
}
