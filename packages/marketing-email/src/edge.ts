import type { SupabaseClient } from '@supabase/supabase-js';
import type { LifecycleEventName } from '@beakerstack/lifecycle-events';

export type { LifecycleEventName };

export async function enqueueMarketingEmail(
  supabase: SupabaseClient,
  productId: string,
  eventType: LifecycleEventName,
  email: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<void> {
  const { data: settings, error: settingsErr } = await supabase
    .from('marketing_email_settings')
    .select('enabled')
    .eq('product_id', productId)
    .maybeSingle();

  if (settingsErr) {
    console.error(
      'enqueueMarketingEmail: settings lookup failed',
      settingsErr.message
    );
    return;
  }
  if (!settings?.enabled) return;

  const { error } = await supabase.from('marketing_email_sync_queue').insert({
    product_id: productId,
    event_type: eventType,
    email,
    payload,
    idempotency_key: idempotencyKey,
  });

  // '23505' is Postgres unique_violation — swallow so callers are idempotent.
  if (error && error.code !== '23505') {
    console.error('enqueueMarketingEmail error', error.message);
  }
}
