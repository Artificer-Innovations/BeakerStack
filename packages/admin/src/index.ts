export {
  checkIsAdmin,
  listUsers,
  getUser,
  grantOperator,
  revokeOperator,
  grantBillingComp,
  revokeBillingComp,
  recordAuditEvent,
  type ListUsersParams,
  type GrantBillingCompParams,
  type RevokeBillingCompParams,
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
