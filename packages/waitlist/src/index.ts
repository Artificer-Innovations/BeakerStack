export {
  defineWaitlistConfig,
  waitlistConfigSchema,
  type WaitlistConfig,
} from './schema.js';
export {
  getPublicWaitlistSettings,
  validateInvite,
  consumeInvite,
  listWaitlistEntries,
  getWaitlistEntry,
  getAdminWaitlistSettings,
  normalizeWaitlistAdminSettings,
  DEFAULT_WAITLIST_ADMIN_SETTINGS,
  updateAdminWaitlistSettings,
  approveWaitlistEntry,
  rejectWaitlistEntry,
  resendWaitlistInvite,
  inviteWaitlistEmail,
  normalizeInviteWaitlistEmailOptions,
  setWaitlistEntryProvisioningIntent,
  buildInviteUrl,
  type InviteWaitlistEmailOptions,
} from './waitlistClient.js';
export {
  parseStoredProvisioningIntent,
  toRpcProvisioningIntent,
  isWaitlistCompIntentInput,
  type WaitlistCompIntentInput,
  type WaitlistPlanIntentInput,
  type WaitlistProvisioningIntent,
  type WaitlistProvisioningIntentInput,
} from './provisioning.js';
export {
  useSignupMode,
  type UseSignupModeResult,
} from './hooks/useSignupMode.js';
export {
  onLifecycleEvent,
  emitLifecycleEvent,
  type LifecycleEventName,
  type LifecycleEventPayload,
} from './lifecycle.js';
export type {
  SignupMode,
  WaitlistEntryStatus,
  WaitlistPublicSettings,
  WaitlistEntryRow,
  WaitlistListResult,
  WaitlistAdminSettings,
  ValidateInviteResult,
} from './types.js';
export {
  resolveWaitlistSignupCopy,
  patchWaitlistSignupCopy,
  DEFAULT_WAITLIST_SIGNUP_COPY,
  WAITLIST_SIGNUP_COPY_KEYS,
  WAITLIST_SIGNUP_COPY_FIELD_LABELS,
  type WaitlistSignupCopy,
  type WaitlistSignupCopyKey,
} from './waitlistSignupCopy.js';
export {
  USE_CASE_FIELD_ID,
  DEFAULT_USE_CASE_FIELD_LABEL,
  defaultUseCaseField,
  findUseCaseField,
  resolveUseCaseFieldEditorState,
  buildMetadataSchemaFromUseCaseEditor,
  resolveWaitlistFormMetadataFields,
  type UseCaseFieldEditorState,
} from './waitlistUseCaseField.js';
export {
  PLAN_INTEREST_METADATA_KEY,
  resolveWaitlistModeCopy,
  formatWaitlistPricingCta,
  DEFAULT_WAITLIST_MODE_COPY,
  WAITLIST_MODE_COPY_KEYS,
  WAITLIST_MODE_COPY_FIELD_LABELS,
  type WaitlistModeCopy,
  type WaitlistModeCopyKey,
} from './waitlistModeCopy.js';
