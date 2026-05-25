/**
 * Helpers for optional Edge Function integration tests (Tier 2).
 */

import { getTestSupabaseConfig } from './test-database';

export function edgeFunctionsEnabled(): boolean {
  return process.env.RUN_INTEGRATION_EDGE_TESTS === '1';
}

export function getFunctionsBaseUrl(): string {
  const { supabaseUrl } = getTestSupabaseConfig();
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}
