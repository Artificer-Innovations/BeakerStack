/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useEffect } from 'react';
// Static import — see init.native.ts for why dynamic import() is unsafe here.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: optional peer dep — not installed in some type-check environments
import * as Sentry from '@sentry/react-native';
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
  useEffect(() => {
    if (!navigationRef?.current) return;
    getReactNavigationIntegration()?.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  const handle = useMemo<ObservabilityHandle>(
    () => ({
      captureException(err, context) {
        Sentry.captureException?.(
          err,
          context ? { extra: context } : undefined
        );
      },
      captureMessage(msg, level = 'info') {
        Sentry.captureMessage?.(msg, level);
      },
      setUser(id) {
        if (id === null) {
          Sentry.setUser?.(null);
        } else {
          void hashUserId(id).then(hash => Sentry.setUser?.({ id: hash }));
        }
      },
      addBreadcrumb(crumb) {
        Sentry.addBreadcrumb?.({
          ...crumb,
          message: scrubEmail(crumb.message),
        });
      },
      withScope(fn) {
        if (typeof Sentry.withScope !== 'function') return fn(null);
        let result!: ReturnType<typeof fn>;
        Sentry.withScope((scope: unknown) => {
          result = fn(scope);
        });
        return result;
      },
      startSpan<T>(name: string, fn: () => T): T {
        if (typeof (Sentry as any).startSpan !== 'function') return fn();
        let result!: T;
        (Sentry as any).startSpan({ name }, () => {
          result = fn();
        });
        return result;
      },
    }),
    []
  );

  return (
    <ObservabilityContext.Provider value={handle}>
      {children}
    </ObservabilityContext.Provider>
  );
}
