import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0';

export type LifecycleEventType =
  | 'user.signed_up'
  | 'waitlist.joined'
  | 'waitlist.approved'
  | 'waitlist.converted'
  | 'user.tier_changed'
  | 'user.churned';

// Fire-and-forget: failures are logged but never thrown so marketing email never
// blocks user-facing flows. A transient failure permanently drops the event —
// Phase 3's worker has no backfill path for unqueued events.
export async function enqueueMarketingEmail(
  supabase: SupabaseClient,
  productId: string,
  eventType: LifecycleEventType,
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
    console.error('enqueueMarketingEmail: settings lookup failed', settingsErr.message);
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

  // '23505' is the Postgres unique_violation code surfaced by PostgREST.
  // Swallow it so callers are naturally idempotent without extra bookkeeping.
  if (error && error.code !== '23505') {
    console.error('enqueueMarketingEmail error', error.message);
  }
}
