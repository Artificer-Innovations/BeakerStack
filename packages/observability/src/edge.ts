// Entry point for non-Supabase Deno environments.
// Supabase Edge Functions use supabase/functions/_shared/observability.ts instead.
export { withEdgeScope, initEdgeObservability } from './init.edge.js';
export type { ObservabilityConfig } from './types.js';
