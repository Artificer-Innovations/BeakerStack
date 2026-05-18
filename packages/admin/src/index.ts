export {
  checkIsAdmin,
  listUsers,
  getUser,
  recordAuditEvent,
  type ListUsersParams,
} from './adminClient.js';
export { useIsAdmin, type UseIsAdminResult } from './hooks/useIsAdmin.js';
export type {
  AdminListUsersSort,
  AdminListUsersSortDir,
  AdminUserListRow,
  AdminListUsersResult,
  AdminUserDetail,
  AdminNavItem,
  RecordAuditEventInput,
} from './types.js';
