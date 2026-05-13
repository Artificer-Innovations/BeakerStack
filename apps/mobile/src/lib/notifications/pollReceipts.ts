import { supabase } from '../supabase';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/getReceipts';

export async function pollReceipts(ticketIds: string[]): Promise<void> {
  if (ticketIds.length === 0) return;

  const res = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });
  const { data } = await res.json() as { data: Record<string, { status: string; details?: { error?: string } }> };

  for (const [, receipt] of Object.entries(data)) {
    if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
      // collect tokens to clean up — but we only have ticket IDs here, not tokens
      // in production this would cross-reference a tickets table; for now log
      console.warn('[pollReceipts] DeviceNotRegistered receipt received');
    }
  }
}

export async function cleanupDeadToken(token: string): Promise<void> {
  await supabase.from('device_tokens').delete().eq('token', token);
}
