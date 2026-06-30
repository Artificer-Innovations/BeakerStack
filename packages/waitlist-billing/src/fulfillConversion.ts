import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FulfillWaitlistConversionResult,
  WaitlistBillingConfig,
} from './types.js';

export async function fulfillWaitlistConversion(
  adminClient: SupabaseClient,
  config: WaitlistBillingConfig,
  ctx: { userId: string; entryId: string }
): Promise<FulfillWaitlistConversionResult> {
  const { data, error } = await adminClient.rpc(
    'waitlist_billing_fulfill_conversion',
    {
      p_user_id: ctx.userId,
      p_entry_id: ctx.entryId,
      p_product_id: config.productId,
      p_allowed_comp_plan_ids: [...config.compPlanIds],
    }
  );
  if (error) return { error: error.message };
  return data as FulfillWaitlistConversionResult;
}
