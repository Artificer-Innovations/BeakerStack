import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

export type LifecycleEventType =
  | 'user.signed_up'
  | 'waitlist.joined'
  | 'waitlist.approved'
  | 'waitlist.converted'
  | 'user.tier_changed'
  | 'user.churned';

export async function enqueueMarketingEmail(
  supabase: ReturnType<typeof createClient>,
  eventType: LifecycleEventType,
  email: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<void> {
  const { data: settings } = await supabase
    .from('marketing_email_settings')
    .select('enabled')
    .eq('enabled', true)
    .limit(1)
    .maybeSingle();

  if (!settings) return;

  const { error } = await supabase.from('marketing_email_sync_queue').insert({
    event_type: eventType,
    email,
    payload,
    idempotency_key: idempotencyKey ?? null,
  });

  if (error && error.code !== '23505') {
    console.error('enqueueMarketingEmail error', error.message);
  }
}
