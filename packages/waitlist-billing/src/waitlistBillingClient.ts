import type { SupabaseClient } from '@supabase/supabase-js';
import {
  approveWaitlistEntry,
  inviteWaitlistEmail,
  toRpcProvisioningIntent,
  type WaitlistProvisioningIntentInput,
} from '@beakerstack/waitlist';
import type { WaitlistBillingConfig } from './types.js';

function compPlanIdsArray(config: WaitlistBillingConfig): string[] {
  return [...config.compPlanIds];
}

export async function inviteWaitlistEmailWithIntent(
  supabase: SupabaseClient,
  config: WaitlistBillingConfig,
  email: string,
  options: {
    metadata?: Record<string, unknown>;
    provisioningIntent?: WaitlistProvisioningIntentInput | null;
  } = {}
) {
  return inviteWaitlistEmail(supabase, email, {
    metadata: options.metadata,
    provisioningIntent: options.provisioningIntent,
    allowedCompPlanIds: compPlanIdsArray(config),
  });
}

export async function approveWaitlistEntryWithIntent(
  supabase: SupabaseClient,
  config: WaitlistBillingConfig,
  entryId: string,
  provisioningIntent?: WaitlistProvisioningIntentInput | null
) {
  return approveWaitlistEntry(supabase, entryId, {
    provisioningIntent,
    allowedCompPlanIds: compPlanIdsArray(config),
  });
}

export async function setWaitlistEntryProvisioningIntent(
  supabase: SupabaseClient,
  config: WaitlistBillingConfig,
  entryId: string,
  provisioningIntent: WaitlistProvisioningIntentInput | null
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
      p_allowed_comp_plan_ids: compPlanIdsArray(config),
    }
  );
  if (error) return { error: error.message };
  return data as {
    ok?: boolean;
    error?: string;
    provisioning_intent?: unknown;
  };
}
