export type LifecycleEventName =
  | 'waitlist.joined'
  | 'waitlist.approved'
  | 'waitlist.rejected'
  | 'waitlist.converted';

export interface LifecycleEventPayload {
  email: string;
  entryId?: string;
  metadata?: Record<string, unknown>;
  /** Set when the waitlist entry is converted to an auth user. */
  userId?: string;
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
  await Promise.all(
    [...listeners].map(async fn => {
      await fn(event, payload);
    })
  );
}
