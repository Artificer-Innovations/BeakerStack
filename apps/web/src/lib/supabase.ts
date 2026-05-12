import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@beakerstack/shared/types/database';
import { Logger } from '@beakerstack/shared/utils/logger';

// In the Node/vite-node pre-render path, env vars may be absent and no Supabase
// calls happen during renderToStaticMarkup, so placeholder values are safe.
// In browser context a missing env var is a build misconfiguration — throw loudly.
const isNode = typeof window === 'undefined';

if (!isNode) {
  if (!import.meta.env.VITE_SUPABASE_URL)
    throw new Error('[web.supabase] VITE_SUPABASE_URL is not set');
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY)
    throw new Error('[web.supabase] VITE_SUPABASE_ANON_KEY is not set');
}

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

if (import.meta.env.DEV) {
  if (isNode && !import.meta.env.VITE_SUPABASE_URL) {
    Logger.warn(
      '[web.supabase] VITE_SUPABASE_URL not set — using placeholder (pre-render only)'
    );
  }
  if (isNode && !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    Logger.warn(
      '[web.supabase] VITE_SUPABASE_ANON_KEY not set — using placeholder (pre-render only)'
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
