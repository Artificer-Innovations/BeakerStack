export {
  KitClient,
  KitClientError,
  isPermanentKitError,
  isRateLimitError,
} from './kitClient.js';
export type { KitAdapterConfig } from './kitConfig.js';
export { defineKitConfig } from './kitConfig.js';
export type { TagSchemeOpts } from './kitTagScheme.js';
export {
  waitlistTag,
  waitlistApprovedTag,
  convertedTag,
  signupTag,
  tierTag,
  churnedTag,
  interestTag,
} from './kitTagScheme.js';
