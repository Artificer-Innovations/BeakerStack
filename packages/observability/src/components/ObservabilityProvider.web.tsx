import React, { useState, useEffect, useMemo } from 'react';
import type { ObservabilityConfig, ObservabilityHandle } from '../types.js';
import { ObservabilityContext } from '../context.js';
import { hashUserId, scrubEmail } from '../pii.js';

interface Props {
  config: ObservabilityConfig;
  children: React.ReactNode;
}

// Module-scope singleton: Vite can statically analyze a top-level dynamic import
// and generate a proper chunk hash. Inside a useEffect callback it can't, leaving
// an unresolved !~{NNN}~ placeholder in the built output.
const _sentryLoad = import('@sentry/react').catch(() => null);

export function ObservabilityProvider({ config: _config, children }: Props) {
  const [Sentry, setSentry] = useState<typeof import('@sentry/react') | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    _sentryLoad.then(s => {
      if (!cancelled) setSentry(s);
    });
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
