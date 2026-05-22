export { defineMarketingEmailConfig } from './schema.js';
export type { MarketingEmailConfig } from './schema.js';
export type { MarketingEmailAdapter } from './types.js';
export { MarketingEmailError } from './errors.js';
export { KitAdapter, isPermanentKitError } from './adapters/kit/kitAdapter.js';
export { defineKitConfig } from './adapters/kit/kitConfig.js';
export type { KitAdapterConfig } from './adapters/kit/kitConfig.js';
export * from './adapters/kit/kitTagScheme.js';
export {
  getAdminMarketingEmailSettings,
  updateAdminMarketingEmailSettings,
  getAdminMarketingEmailQueueStats,
  normalizeMarketingEmailAdminSettings,
  DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS,
} from './marketingEmailAdminClient.js';
export type {
  MarketingEmailAdminSettings,
  MarketingEmailQueueStats,
} from './marketingEmailAdminClient.js';
