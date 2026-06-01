import type { StoredConnectionStatus } from '../schema.js';

/** Stable reference for hooks — do not inline `['pending']` in JSX/hooks. */
export const CONNECTIONS_PENDING_STATUS_FILTER: (
  | StoredConnectionStatus
  | 'expired_pending'
)[] = ['pending'];
