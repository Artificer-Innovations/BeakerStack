import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@beakerstack/shared/types/database';
import { Logger } from '@beakerstack/shared/utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

if (import.meta.env.DEV) {
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
