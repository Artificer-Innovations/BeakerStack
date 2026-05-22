import type { SupabaseClient } from '@supabase/supabase-js';

export interface MarketingEmailAdminSettings {
  product_id: string;
  enabled: boolean;
  provider: 'kit';
  config: {
    namespace: string;
    kitFormId: string;
    tierTagNames: string[];
  };
  updated_at: string;
}

export interface MarketingEmailQueueStats {
  pending: number;
  processing: number;
  done: number;
  failed: number;
}

export const DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS: MarketingEmailAdminSettings =
  {
    product_id: 'beakerstack',
    enabled: false,
    provider: 'kit',
    config: {
      namespace: '',
      kitFormId: '',
      tierTagNames: [],
    },
    updated_at: '',
  };

export function normalizeMarketingEmailAdminSettings(
  raw: Record<string, unknown>
): MarketingEmailAdminSettings {
  const config =
    raw.config && typeof raw.config === 'object' && !Array.isArray(raw.config)
      ? (raw.config as Record<string, unknown>)
      : {};
  return {
    product_id:
      typeof raw.product_id === 'string'
        ? raw.product_id
        : DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS.product_id,
    enabled: raw.enabled === true,
    provider: 'kit',
    config: {
      namespace: typeof config.namespace === 'string' ? config.namespace : '',
      kitFormId: typeof config.kitFormId === 'string' ? config.kitFormId : '',
      tierTagNames: Array.isArray(config.tierTagNames)
        ? (config.tierTagNames as string[])
        : [],
    },
    updated_at:
      typeof raw.updated_at === 'string'
        ? raw.updated_at
        : DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS.updated_at,
  };
}

export async function getAdminMarketingEmailSettings(
  supabase: SupabaseClient,
  productId = 'beakerstack'
): Promise<MarketingEmailAdminSettings | null> {
  const { data, error } = await supabase.rpc(
    'admin_get_marketing_email_settings',
    { p_product_id: productId }
  );
  if (error || !data || (data as { error?: string }).error) return null;
  const payload = data as { settings?: Record<string, unknown> | null };
  if (!payload.settings) return null;
  return normalizeMarketingEmailAdminSettings(payload.settings);
}

export async function updateAdminMarketingEmailSettings(
  supabase: SupabaseClient,
  params: {
    product_id: string;
    enabled: boolean;
    config: { namespace: string; kitFormId: string; tierTagNames: string[] };
  }
): Promise<MarketingEmailAdminSettings | null> {
  const { data, error } = await supabase.rpc(
    'admin_update_marketing_email_settings',
    {
      p_product_id: params.product_id,
      p_enabled: params.enabled,
      p_config: params.config,
    }
  );
  if (error || !data || (data as { error?: string }).error) return null;
  const payload = data as { settings?: Record<string, unknown> | null };
  if (!payload.settings) return null;
  return normalizeMarketingEmailAdminSettings(payload.settings);
}

export async function getAdminMarketingEmailQueueStats(
  supabase: SupabaseClient
): Promise<MarketingEmailQueueStats | null> {
  const { data, error } = await supabase.rpc(
    'admin_get_marketing_email_queue_stats'
  );
  if (error || !data || (data as { error?: string }).error) return null;
  const raw = data as Record<string, unknown>;
  return {
    pending: typeof raw.pending === 'number' ? raw.pending : 0,
    processing: typeof raw.processing === 'number' ? raw.processing : 0,
    done: typeof raw.done === 'number' ? raw.done : 0,
    failed: typeof raw.failed === 'number' ? raw.failed : 0,
  };
}
