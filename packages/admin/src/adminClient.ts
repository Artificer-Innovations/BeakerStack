import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminListUsersResult,
  AdminListUsersSort,
  AdminListUsersSortDir,
  AdminUserDetail,
  AdminUserListRow,
  RecordAuditEventInput,
} from './types.js';

function isNotFound(payload: unknown): boolean {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    'error' in payload &&
    (payload as { error?: string }).error === 'not_found'
  );
}

/** PostgREST errors are plain objects; wrap so callers get a readable message. */
function rpcError(error: { message?: string }): Error {
  return new Error(error.message ?? 'RPC request failed');
}

export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_is_admin');
  if (error) return false;
  return Boolean(data);
}

export type ListUsersParams = {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: AdminListUsersSort;
  sortDir?: AdminListUsersSortDir;
  productId?: string;
};

export async function listUsers(
  supabase: SupabaseClient,
  params: ListUsersParams = {}
): Promise<AdminListUsersResult | null> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_limit: params.limit ?? 25,
    p_offset: params.offset ?? 0,
    p_search: params.search ?? undefined,
    p_sort: params.sort ?? 'signup',
    p_sort_dir: params.sortDir ?? 'desc',
    p_product_id: params.productId ?? 'beakerstack',
  });
  if (error) throw rpcError(error);
  if (isNotFound(data)) return null;

  const body = data as Record<string, unknown>;
  const users = (body['users'] as AdminUserListRow[] | undefined) ?? [];
  return {
    users,
    total: Number(body['total'] ?? 0),
    limit: Number(body['limit'] ?? params.limit ?? 25),
    offset: Number(body['offset'] ?? params.offset ?? 0),
  };
}

export async function getUser(
  supabase: SupabaseClient,
  userId: string,
  productId = 'beakerstack'
): Promise<AdminUserDetail | null> {
  const { data, error } = await supabase.rpc('admin_get_user', {
    p_user_id: userId,
    p_product_id: productId,
  });
  if (error) throw rpcError(error);
  if (isNotFound(data)) return null;
  return data as AdminUserDetail;
}

export async function recordAuditEvent(
  supabase: SupabaseClient,
  input: RecordAuditEventInput
): Promise<void> {
  const { error } = await supabase.rpc('admin_record_audit_event', {
    p_action: input.action,
    p_target_type: input.target?.type ?? undefined,
    p_target_id: input.target?.id ?? undefined,
    p_details: (input.details ?? {}) as Record<string, never>,
  });
  if (error) throw rpcError(error);
}
