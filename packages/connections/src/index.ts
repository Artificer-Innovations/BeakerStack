export {
  storedConnectionStatusSchema,
  effectiveConnectionStatusSchema,
  connectionListRowSchema,
  connectionStatusRowSchema,
  userSearchRowSchema,
  type StoredConnectionStatus,
  type EffectiveConnectionStatus,
  type ConnectionListRow,
  type ConnectionStatusRow,
  type UserSearchRow,
} from './schema.js';
export {
  connectionsError,
  mapUnknownError,
  type ConnectionsError,
  type ConnectionsErrorKind,
} from './errors.js';
export {
  connectionsRequest,
  connectionsAccept,
  connectionsDecline,
  connectionsBlock,
  connectionsUnblock,
  connectionsDisconnect,
  connectionsList,
  connectionsGetStatus,
  connectionsSearchUsers,
} from './connectionsClient.js';
export { useConnections } from './hooks/useConnections.js';
export { useConnectionStatus } from './hooks/useConnectionStatus.js';
export { useIncomingConnectionRequests } from './hooks/useIncomingConnectionRequests.js';
