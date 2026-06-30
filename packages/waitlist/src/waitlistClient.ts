import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IdentityMatchMode,
  SignupMode,
  ValidateInviteResult,
  WaitlistAdminSettings,
  WaitlistListResult,
  WaitlistMetadataField,
  WaitlistPublicSettings,
} from './types.js';
import {
  toRpcProvisioningIntent,
  type WaitlistProvisioningIntentInput,
} from './provisioning.js';

export type InviteWaitlistEmailOptions = {
  metadata?: Record<string, unknown>;
  provisioningIntent?: WaitlistProvisioningIntentInput | null;
  allowedCompPlanIds?: string[];
};

function isInviteWaitlistEmailOptions(
  value: Record<string, unknown>
): value is InviteWaitlistEmailOptions {
  return (
    'metadata' in value ||
    'provisioningIntent' in value ||
    'allowedCompPlanIds' in value
  );
}

/** Supports legacy callers that passed a bare metadata object as the third arg. */
export function normalizeInviteWaitlistEmailOptions(
  options?: InviteWaitlistEmailOptions | Record<string, unknown>
): InviteWaitlistEmailOptions {
  if (!options) return {};
  if (isInviteWaitlistEmailOptions(options)) return options;
  return { metadata: options };
}

export const DEFAULT_WAITLIST_ADMIN_SETTINGS: WaitlistAdminSettings = {
  signup_mode: 'open',
  default_plan_id: 'beakerstack_free',
  invite_ttl_days: 7,
  identity_match_mode: 'lenient',
  copy: {},
  metadata_schema: [],
  updated_at: '',
};

const SIGNUP_MODES: SignupMode[] = [
  'open',
  'waitlist',
  'invite_only',
  'closed',
];

const IDENTITY_MATCH_MODES: IdentityMatchMode[] = ['lenient', 'strict'];

/** Coerce RPC JSON so controlled form fields never receive null. */
export function normalizeWaitlistAdminSettings(
  raw: Record<string, unknown> | WaitlistAdminSettings
): WaitlistAdminSettings {
  const signupMode = raw.signup_mode;
  const identityMode = raw.identity_match_mode;
  return {
    signup_mode: SIGNUP_MODES.includes(signupMode as SignupMode)
      ? (signupMode as SignupMode)
      : DEFAULT_WAITLIST_ADMIN_SETTINGS.signup_mode,
    default_plan_id:
      typeof raw.default_plan_id === 'string' && raw.default_plan_id.length > 0
        ? raw.default_plan_id
        : DEFAULT_WAITLIST_ADMIN_SETTINGS.default_plan_id,
    invite_ttl_days:
      typeof raw.invite_ttl_days === 'number' && raw.invite_ttl_days >= 1
        ? raw.invite_ttl_days
        : DEFAULT_WAITLIST_ADMIN_SETTINGS.invite_ttl_days,
    identity_match_mode: IDENTITY_MATCH_MODES.includes(
      identityMode as IdentityMatchMode
    )
      ? (identityMode as IdentityMatchMode)
      : DEFAULT_WAITLIST_ADMIN_SETTINGS.identity_match_mode,
    copy:
      raw.copy && typeof raw.copy === 'object' && !Array.isArray(raw.copy)
        ? (raw.copy as Record<string, Record<string, string>>)
        : DEFAULT_WAITLIST_ADMIN_SETTINGS.copy,
    metadata_schema: Array.isArray(raw.metadata_schema)
      ? (raw.metadata_schema as WaitlistMetadataField[])
      : DEFAULT_WAITLIST_ADMIN_SETTINGS.metadata_schema,
    updated_at:
      typeof raw.updated_at === 'string'
        ? raw.updated_at
        : DEFAULT_WAITLIST_ADMIN_SETTINGS.updated_at,
  };
}

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
): Promise<{
  ok?: boolean;
  error?: string;
  already_converted?: boolean;
  entry_id?: string;
  default_plan_id?: string;
  provisioning_intent?: unknown;
}> {
  const { data, error } = await supabase.rpc('waitlist_consume_invite', {
    p_token: token,
    p_user_id: userId,
    p_user_email: userEmail ?? null,
  });
  if (error) return { error: error.message };
  return data as {
    ok?: boolean;
    error?: string;
    already_converted?: boolean;
    entry_id?: string;
    default_plan_id?: string;
    provisioning_intent?: unknown;
  };
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
  return normalizeWaitlistAdminSettings(data as Record<string, unknown>);
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
  return normalizeWaitlistAdminSettings(data as Record<string, unknown>);
}

export async function approveWaitlistEntry(
  supabase: SupabaseClient,
  id: string,
  options: {
    provisioningIntent?: WaitlistProvisioningIntentInput | null;
    allowedCompPlanIds?: string[];
  } = {}
): Promise<{
  ok?: boolean;
  invite_token?: string;
  email?: string;
  error?: string;
} | null> {
  const updateIntent = options.provisioningIntent !== undefined;
  const { data, error } = await supabase.rpc('admin_approve_waitlist_entry', {
    p_id: id,
    p_provisioning_intent: updateIntent
      ? toRpcProvisioningIntent(options.provisioningIntent ?? null)
      : null,
    p_update_provisioning_intent: updateIntent,
    p_allowed_comp_plan_ids: options.allowedCompPlanIds ?? null,
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

export async function inviteWaitlistEmail(
  supabase: SupabaseClient,
  email: string,
  options?: InviteWaitlistEmailOptions | Record<string, unknown>
): Promise<{
  ok?: boolean;
  entry_id?: string;
  invite_token?: string;
  email?: string;
  created?: boolean;
  error?: string;
} | null> {
  const normalized = normalizeInviteWaitlistEmailOptions(options);
  const updateIntent = normalized.provisioningIntent !== undefined;
  const { data, error } = await supabase.rpc('admin_invite_waitlist_email', {
    p_email: email,
    p_metadata: normalized.metadata ?? {},
    p_provisioning_intent: updateIntent
      ? toRpcProvisioningIntent(normalized.provisioningIntent ?? null)
      : null,
    p_update_provisioning_intent: updateIntent,
    p_allowed_comp_plan_ids: normalized.allowedCompPlanIds ?? null,
  });
  if (error) return { error: error.message };
  if ((data as { error?: string })?.error) return data as { error: string };
  return data as {
    ok?: boolean;
    entry_id?: string;
    invite_token?: string;
    email?: string;
    created?: boolean;
  };
}

export async function setWaitlistEntryProvisioningIntent(
  supabase: SupabaseClient,
  entryId: string,
  provisioningIntent: WaitlistProvisioningIntentInput | null,
  allowedCompPlanIds?: string[]
): Promise<{
  ok?: boolean;
  error?: string;
  provisioning_intent?: unknown;
} | null> {
  const { data, error } = await supabase.rpc(
    'admin_set_waitlist_entry_provisioning_intent',
    {
      p_entry_id: entryId,
      p_provisioning_intent: toRpcProvisioningIntent(provisioningIntent),
      p_allowed_comp_plan_ids: allowedCompPlanIds ?? null,
    }
  );
  if (error) return { error: error.message };
  return data as {
    ok?: boolean;
    error?: string;
    provisioning_intent?: unknown;
  };
}

export function buildInviteUrl(appOrigin: string, token: string): string {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/signup/invite#token=${encodeURIComponent(token)}`;
}
