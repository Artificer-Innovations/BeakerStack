import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';

let _initialized = false;

export function initEdgeObservability(config: ObservabilityConfig): void {
  if (_initialized) return;
  validateConfig(config);
  _initialized = true;
}

export function withEdgeScope(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return (req) => handler(req);
}

export function resetForTesting(): void {
  _initialized = false;
}
