// Backward-compatible re-export. The lifecycle system lives in @beakerstack/lifecycle-events.
export {
  onLifecycleEvent,
  emitLifecycleEvent,
} from '@beakerstack/lifecycle-events';
export type {
  LifecycleEventName,
  LifecycleEventPayload,
  LifecycleListener,
} from '@beakerstack/lifecycle-events';
