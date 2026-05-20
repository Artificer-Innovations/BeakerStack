/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import type { ObservabilityConfig, ObservabilityHandle } from '../types.js';
import { ObservabilityContext } from '../context.js';
import { hashUserId, scrubEmail } from '../pii.js';
import { getReactNavigationIntegration } from '../reactNavigationIntegration.native.js';

interface Props {
  config: ObservabilityConfig;
  children: React.ReactNode;
  navigationRef?: React.RefObject<unknown>;
}

export function ObservabilityProvider({
  config: _config,
  children,
  navigationRef,
}: Props) {
  const [Sentry, setSentry] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: optional peer dep — not installed in type-check environments
    import('@sentry/react-native')
      .then(s => {
        if (!cancelled) setSentry(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navigationRef?.current) return;
    getReactNavigationIntegration()?.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  const handle = useMemo<ObservabilityHandle>(
    () => ({
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
          void hashUserId(id).then(hash => Sentry?.setUser({ id: hash }));
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
    }),
    [Sentry]
  );

  return (
    <ObservabilityContext.Provider value={handle}>
      {children}
    </ObservabilityContext.Provider>
  );
}
