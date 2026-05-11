import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@beakerstack/shared/types/database';
import { Logger } from '@beakerstack/shared/utils/logger';

// Defensive fallback allows the module to load in the vite-node pre-render
// context where env vars may be absent. No Supabase calls are made during
// renderToStaticMarkup, so placeholder values are safe.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    Logger.warn(
      '[web.supabase] VITE_SUPABASE_URL not set — using placeholder (pre-render only)'
    );
  }
  const realtimeUrl = supabaseUrl.replace(
    /^http(s?)/,
    (_: string, secure: string) => (secure ? 'wss' : 'ws')
  );
  Logger.debug('[web.supabase] HTTP base URL:', supabaseUrl);
  Logger.debug(
    '[web.supabase] Realtime websocket URL:',
    `${realtimeUrl}/realtime/v1/websocket`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Same client as {@link supabase}. Use for `rpc()` calls whose names are not
 * always inferred from `Database['public']['Functions']` (e.g. strict CI
 * builds resolving an incomplete RPC map).
 */
export const supabaseRpc: SupabaseClient =
  supabase as unknown as SupabaseClient;

export type TypedSupabaseClient = typeof supabase;
