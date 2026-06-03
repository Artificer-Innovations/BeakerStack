import type { SupabaseClient } from '@supabase/supabase-js';
import { mapUnknownError } from './errors.js';
import type {
  ConnectionListRow,
  ConnectionStatusRow,
  EffectiveConnectionStatus,
  StoredConnectionStatus,
  UserSearchRow,
} from './schema.js';

export async function connectionsRequest(
  supabase: SupabaseClient,
  recipientUserId: string
) {
  const { data, error } = await supabase.rpc('connections_request', {
    p_recipient_user_id: recipientUserId,
  });
  if (error) throw mapUnknownError(error);
  return data?.[0] ?? null;
}

export async function connectionsAccept(
  supabase: SupabaseClient,
  connectionId: string
) {
  const { data, error } = await supabase.rpc('connections_accept', {
    p_connection_id: connectionId,
  });
  if (error) throw mapUnknownError(error);
  return data?.[0] ?? null;
}

export async function connectionsDecline(
  supabase: SupabaseClient,
  connectionId: string
) {
  const { error } = await supabase.rpc('connections_decline', {
    p_connection_id: connectionId,
  });
  if (error) throw mapUnknownError(error);
}

export async function connectionsBlock(
  supabase: SupabaseClient,
  otherUserId: string
) {
  const { data, error } = await supabase.rpc('connections_block', {
    p_other_user_id: otherUserId,
  });
  if (error) throw mapUnknownError(error);
  return data?.[0] ?? null;
}

export async function connectionsUnblock(
  supabase: SupabaseClient,
  otherUserId: string
) {
  const { error } = await supabase.rpc('connections_unblock', {
    p_other_user_id: otherUserId,
  });
  if (error) throw mapUnknownError(error);
}

export async function connectionsDisconnect(
  supabase: SupabaseClient,
  connectionId: string
) {
  const { error } = await supabase.rpc('connections_disconnect', {
    p_connection_id: connectionId,
  });
  if (error) throw mapUnknownError(error);
}

export async function connectionsList(
  supabase: SupabaseClient,
  options?: {
    status?: (StoredConnectionStatus | 'expired_pending')[];
    limit?: number;
    offset?: number;
  }
): Promise<ConnectionListRow[]> {
  const { data, error } = await supabase.rpc('connections_list', {
    p_status: options?.status ?? null,
    p_limit: options?.limit ?? 25,
    p_offset: options?.offset ?? 0,
  });
  if (error) throw mapUnknownError(error);
  return (data ?? []) as ConnectionListRow[];
}

export async function connectionsGetStatus(
  supabase: SupabaseClient,
  otherUserId: string
): Promise<ConnectionStatusRow> {
  const { data, error } = await supabase.rpc('connections_get_status', {
    p_other_user_id: otherUserId,
  });
  if (error) throw mapUnknownError(error);
  const row = data?.[0];
  return (
    row ?? {
      status: 'none',
      effective_status: 'none' as EffectiveConnectionStatus,
      is_initiator: false,
      connection_id: null,
    }
  );
}

export async function connectionsSearchUsers(
  supabase: SupabaseClient,
  query: string,
  limit = 20
): Promise<UserSearchRow[]> {
  const { data, error } = await supabase.rpc('connections_search_users', {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw mapUnknownError(error);
  return (data ?? []) as UserSearchRow[];
}
