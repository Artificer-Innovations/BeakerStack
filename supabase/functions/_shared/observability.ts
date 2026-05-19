/**
 * Lightweight observability helper for Supabase Edge Functions.
 *
 * Sentry's Node/browser SDKs are not compatible with the Deno/Edge runtime, so
 * this module provides a thin no-op wrapper that mirrors the @beakerstack/observability
 * API surface. When a proper edge-compatible SDK becomes available, swap the
 * implementation here without touching call-sites.
 *
 * Usage:
 *   import { withEdgeScope, initEdgeObservability } from '../_shared/observability.ts';
 *   initEdgeObservability({ project: 'my-fn', environment: Deno.env.get('ENVIRONMENT') ?? 'development' });
 *   Deno.serve(withEdgeScope(async (req) => { ... }));
 */

export interface EdgeObservabilityConfig {
  project: string;
  environment: string;
  release?: string;
}

let _config: EdgeObservabilityConfig | null = null;

export function initEdgeObservability(config: EdgeObservabilityConfig): void {
  _config = config;
}

export function withEdgeScope(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return (req) => handler(req);
}

export function captureEdgeException(err: unknown): void {
  const project = _config?.project ?? 'unknown';
  const env = _config?.environment ?? 'unknown';
  console.error(`[observability] ${project}/${env} uncaught:`, err);
}
