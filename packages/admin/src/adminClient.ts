import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminListUsersResult,
  AdminListUsersSort,
  AdminListUsersSortDir,
  AdminUserDetail,
  AdminUserListRow,
  RecordAuditEventInput,
} from './types.js';

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return (
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
  );
}

function isNotFound(payload: unknown): boolean {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    'error' in payload &&
    (payload as { error?: string }).error === 'not_found'
  );
}

function errorCode(payload: unknown): string | undefined {
  if (payload !== null && typeof payload === 'object' && 'error' in payload) {
    return (payload as { error?: string }).error;
  }
  return undefined;
}

/** PostgREST errors are plain objects; wrap so callers get a readable message. */
function rpcError(error: { message?: string }): Error {
  return new Error(error.message ?? 'RPC request failed');
}

export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_is_admin');
  if (error) throw rpcError(error);
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

  if (!isRecord(data)) {
    throw new Error('admin_list_users returned unexpected payload');
  }

  const users = (data['users'] as AdminUserListRow[] | undefined) ?? [];
  const total = Number(data['total'] ?? 0);
  const limit = Number(data['limit'] ?? params.limit ?? 25);
  const offset = Number(data['offset'] ?? params.offset ?? 0);

  if (Number.isNaN(total) || Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new Error('admin_list_users returned invalid pagination fields');
  }

  return { users, total, limit, offset };
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

export async function grantOperator(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase.rpc('admin_grant_operator', {
    p_user_id: userId,
  });
  if (error) throw rpcError(error);
  if (isNotFound(data)) throw new Error('not_found');
}

export async function revokeOperator(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase.rpc('admin_revoke_operator', {
    p_user_id: userId,
  });
  if (error) throw rpcError(error);
  if (isNotFound(data)) throw new Error('not_found');
  const code = errorCode(data);
  if (code === 'cannot_self_revoke') throw new Error('cannot_self_revoke');
}

export async function recordAuditEvent(
  supabase: SupabaseClient,
  input: RecordAuditEventInput
): Promise<void> {
  const { error } = await supabase.rpc('admin_record_audit_event', {
    p_action: input.action,
    p_target_type: input.target?.type ?? undefined,
    p_target_id: input.target?.id ?? undefined,
    p_details: (input.details ?? {}) as Record<string, unknown>,
  });
  if (error) throw rpcError(error);
}
