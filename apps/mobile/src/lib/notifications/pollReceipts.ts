import { supabase } from '../supabase';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/getReceipts';

/**
 * Poll Expo receipt API for delivered/failed statuses.
 * Returns ticket IDs for receipts with DeviceNotRegistered errors so callers
 * can cross-reference against a push_tickets table to clean up dead tokens.
 * Full cleanup path tracked in #138.
 */
export async function pollReceipts(ticketIds: string[]): Promise<{ deadTicketIds: string[] }> {
  if (ticketIds.length === 0) return { deadTicketIds: [] };

  const res = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });
  const { data } = await res.json() as {
    data: Record<string, { status: string; details?: { error?: string } }>
  };

  const deadTicketIds: string[] = [];
  for (const [ticketId, receipt] of Object.entries(data)) {
    if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
      // Token is dead. Cleanup requires a ticket→token mapping table (see #138).
      // Return the ticket ID so callers with that mapping can call cleanupDeadToken().
      console.warn('[pollReceipts] DeviceNotRegistered for ticket', ticketId);
      deadTicketIds.push(ticketId);
    }
  }

  return { deadTicketIds };
}

export async function cleanupDeadToken(token: string): Promise<void> {
  await supabase.from('device_tokens').delete().eq('token', token);
}
