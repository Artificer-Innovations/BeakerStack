import React, { useState, useEffect, useMemo } from 'react';
import type { ObservabilityConfig, ObservabilityHandle } from '../types.js';
import { ObservabilityContext } from '../context.js';
import { hashUserId, scrubEmail } from '../pii.js';

interface Props {
  config: ObservabilityConfig;
  children: React.ReactNode;
}

export function ObservabilityProvider({ config: _config, children }: Props) {
  const [Sentry, setSentry] = useState<typeof import('@sentry/react') | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    import('@sentry/react')
      .then(s => {
        if (!cancelled) setSentry(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
        Sentry.withScope(scope => {
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
    }),
    [Sentry]
  );

  return (
    <ObservabilityContext.Provider value={handle}>
      {children}
    </ObservabilityContext.Provider>
  );
}
