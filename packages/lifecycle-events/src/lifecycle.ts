/**
 * Stable public API — do not rename or remove event names without a deprecation cycle.
 * Full taxonomy: packages/lifecycle-events/README.md
 */

import { Logger } from '@beakerstack/logger';

export type LifecycleEventName =
  | 'waitlist.joined'
  | 'waitlist.approved'
  | 'waitlist.rejected'
  | 'waitlist.converted'
  | 'user.signed_up'
  | 'user.tier_changed'
  | 'user.churned';

export interface LifecycleEventPayload {
  email: string;
  entryId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  /** user.tier_changed: the tier before the change */
  previousTier?: string;
  /** user.tier_changed: the new active tier */
  newTier?: string;
}

export type LifecycleListener = (
  event: LifecycleEventName,
  payload: LifecycleEventPayload
) => void | Promise<void>;

const listeners = new Set<LifecycleListener>();

export function onLifecycleEvent(listener: LifecycleListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function emitLifecycleEvent(
  event: LifecycleEventName,
  payload: LifecycleEventPayload
): Promise<void> {
  const results = await Promise.allSettled(
    [...listeners].map(fn => Promise.resolve().then(() => fn(event, payload)))
  );
  for (const result of results) {
    if (result.status === 'rejected') {
      Logger.error('[lifecycle-events] listener failed:', event, result.reason);
    }
  }
}

/** Reset module-level listener state. Test use only. */
export function resetListenersForTesting(): void {
  listeners.clear();
}
