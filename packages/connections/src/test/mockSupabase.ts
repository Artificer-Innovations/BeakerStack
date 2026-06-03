import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RpcHandler = (
  name: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>;

export function createMockSupabase(rpc: RpcHandler): SupabaseClient {
  const changeHandlers: Array<() => void> = [];
  const channel = {
    state: 'closed' as string,
    on: vi.fn((_event: string, _filter: unknown, cb: () => void) => {
      changeHandlers.push(cb);
      return channel;
    }),
    subscribe: vi.fn(function (this: typeof channel) {
      this.state = 'joined';
      return channel;
    }),
  };

  const client = {
    rpc: vi.fn((name: string, args: Record<string, unknown>) =>
      rpc(name, args)
    ),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    __changeHandlers: changeHandlers,
  };

  return client as unknown as SupabaseClient;
}

export function emitConnectionChange(supabase: SupabaseClient) {
  const handlers = (
    supabase as unknown as { __changeHandlers: Array<() => void> }
  ).__changeHandlers;
  for (const cb of handlers) cb();
}
