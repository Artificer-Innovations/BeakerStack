import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ValidateInviteResult,
  WaitlistAdminSettings,
  WaitlistListResult,
  WaitlistPublicSettings,
} from './types.js';

export async function getPublicWaitlistSettings(
  supabase: SupabaseClient
): Promise<WaitlistPublicSettings | null> {
  const { data, error } = await supabase.rpc('waitlist_get_public_settings');
  if (error) return null;
  return data as WaitlistPublicSettings;
}

export async function validateInvite(
  supabase: SupabaseClient,
  token: string
): Promise<ValidateInviteResult> {
  const { data, error } = await supabase.rpc('waitlist_validate_invite', {
    p_token: token,
  });
  if (error) return { valid: false };
  return data as ValidateInviteResult;
}

export async function consumeInvite(
  supabase: SupabaseClient,
  token: string,
  userId: string,
  userEmail?: string | null
): Promise<{ ok?: boolean; error?: string; default_plan_id?: string }> {
  const { data, error } = await supabase.rpc('waitlist_consume_invite', {
    p_token: token,
    p_user_id: userId,
    p_user_email: userEmail ?? null,
  });
  if (error) return { error: error.message };
  return data as { ok?: boolean; error?: string; default_plan_id?: string };
}

export async function listWaitlistEntries(
  supabase: SupabaseClient,
  params: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string | null;
  } = {}
): Promise<WaitlistListResult | null> {
  const { data, error } = await supabase.rpc('admin_list_waitlist_entries', {
    p_limit: params.limit ?? 25,
    p_offset: params.offset ?? 0,
    p_search: params.search ?? null,
    p_status: params.status ?? null,
  });
  if (error || !data || (data as { error?: string }).error) return null;
  const parsed = data as {
    entries: WaitlistListResult['entries'];
    total: number;
    limit: number;
    offset: number;
  };
  return {
    entries: parsed.entries ?? [],
    total: parsed.total ?? 0,
    limit: parsed.limit ?? 25,
    offset: parsed.offset ?? 0,
  };
}

export async function getWaitlistEntry(
  supabase: SupabaseClient,
  id: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc('admin_get_waitlist_entry', {
    p_id: id,
  });
  if (error || !data || (data as { error?: string }).error) return null;
  return data as Record<string, unknown>;
}

export async function getAdminWaitlistSettings(
  supabase: SupabaseClient
): Promise<WaitlistAdminSettings | null> {
  const { data, error } = await supabase.rpc('admin_get_waitlist_settings');
  if (error || !data || (data as { error?: string }).error) return null;
  return data as WaitlistAdminSettings;
}

export async function updateAdminWaitlistSettings(
  supabase: SupabaseClient,
  patch: Partial<{
    signup_mode: string;
    default_plan_id: string;
    invite_ttl_days: number;
    identity_match_mode: string;
    copy: Record<string, Record<string, string>>;
    metadata_schema: unknown[];
  }>
): Promise<WaitlistAdminSettings | null> {
  const { data, error } = await supabase.rpc('admin_update_waitlist_settings', {
    p_signup_mode: patch.signup_mode ?? null,
    p_default_plan_id: patch.default_plan_id ?? null,
    p_invite_ttl_days: patch.invite_ttl_days ?? null,
    p_identity_match_mode: patch.identity_match_mode ?? null,
    p_copy: patch.copy ?? null,
    p_metadata_schema: patch.metadata_schema ?? null,
  });
  if (error || !data || (data as { error?: string }).error) return null;
  return data as WaitlistAdminSettings;
}

export async function approveWaitlistEntry(
  supabase: SupabaseClient,
  id: string
): Promise<{
  ok?: boolean;
  invite_token?: string;
  email?: string;
  error?: string;
} | null> {
  const { data, error } = await supabase.rpc('admin_approve_waitlist_entry', {
    p_id: id,
  });
  if (error) return { error: error.message };
  if ((data as { error?: string })?.error) return data as { error: string };
  return data as { ok?: boolean; invite_token?: string; email?: string };
}

export async function rejectWaitlistEntry(
  supabase: SupabaseClient,
  id: string
): Promise<{ ok?: boolean; error?: string } | null> {
  const { data, error } = await supabase.rpc('admin_reject_waitlist_entry', {
    p_id: id,
  });
  if (error) return { error: error.message };
  return data as { ok?: boolean; error?: string };
}

export async function resendWaitlistInvite(
  supabase: SupabaseClient,
  id: string
): Promise<{
  ok?: boolean;
  invite_token?: string;
  email?: string;
  error?: string;
} | null> {
  const { data, error } = await supabase.rpc('admin_resend_waitlist_invite', {
    p_id: id,
  });
  if (error) return { error: error.message };
  return data as {
    ok?: boolean;
    invite_token?: string;
    email?: string;
    error?: string;
  };
}

export function buildInviteUrl(appOrigin: string, token: string): string {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/signup/invite#token=${encodeURIComponent(token)}`;
}
