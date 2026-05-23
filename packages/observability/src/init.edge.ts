/* eslint-disable no-console -- edge telemetry sink: forwards Logger calls to console
   since Sentry is unavailable in Deno Edge Functions; real capture wired in #354 */
import { setupLogging } from '@beakerstack/logger';
import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';

let _initialized = false;

export function initEdgeObservability(config: ObservabilityConfig): void {
  if (_initialized) return;
  validateConfig(config);
  setupLogging({
    captureException: (err: unknown) =>
      console.error('[edge-observability]', err),
    captureMessage: (msg: string, level?: 'info' | 'warning' | 'error') =>
      console.log(`[edge-observability:${level ?? 'info'}]`, msg),
    addBreadcrumb: (crumb: {
      message: string;
      category?: string;
      data?: Record<string, unknown>;
    }) =>
      console.debug(
        '[edge-observability:breadcrumb]',
        crumb.category ?? '',
        crumb.message
      ),
  });
  _initialized = true;
}

export function withEdgeScope(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  // TODO: wrap with Sentry.runWithAsyncContext once Deno async context API is stable
  return req => handler(req);
}

export function resetForTesting(): void {
  _initialized = false;
}
