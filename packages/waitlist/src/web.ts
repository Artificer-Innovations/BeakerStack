export {
  WaitlistForm,
  type WaitlistFormProps,
} from './components/WaitlistForm.web.js';
export {
  SignupModeGate,
  type SignupModeGateProps,
} from './components/SignupModeGate.web.js';
export {
  useSignupMode,
  type UseSignupModeResult,
} from './hooks/useSignupMode.js';
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
  PLAN_INTEREST_METADATA_KEY,
  resolveWaitlistModeCopy,
  formatWaitlistPricingCta,
  DEFAULT_WAITLIST_MODE_COPY,
  WAITLIST_MODE_COPY_KEYS,
  WAITLIST_MODE_COPY_FIELD_LABELS,
  type WaitlistModeCopy,
  type WaitlistModeCopyKey,
} from './waitlistModeCopy.js';
