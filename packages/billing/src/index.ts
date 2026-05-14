/**
 * @beakerstack/billing — shared types, schema, provider, and hooks (no platform UI).
 * UI: `@beakerstack/billing/web` or `@beakerstack/billing/native`.
 * Next.js App Router: `@beakerstack/billing/client` (marks use client).
 */
export {
  defineBillingConfig,
  productBillingConfigSchema,
  billingPlanConfigSchema,
  planFeatureRowSchema,
  downgradeConstraintCopySchema,
  type BillingConfig,
  type BillingPlanConfig,
  type ProductBillingConfig,
  type PlanFeatureRowConfig,
  type DowngradeConstraintCopy,
  type InferFeatureKeys,
  type InferMeterKeys,
} from './schema.js';
export {
  billingError,
  mapUnknownError,
  type BillingError,
  type BillingErrorKind,
} from './errors.js';
export { BillingErrorBoundary } from './BillingErrorBoundary.js';
export {
  BillingProvider,
  type BillingProviderProps,
} from './BillingProvider.js';
export {
  BillingConfigProvider,
  type BillingConfigProviderProps,
} from './BillingConfigProvider.js';
export type {
  Plan,
  PlanId,
  SubscriptionRow,
  UsageSnapshot,
  BillingContextValue,
  BillingInvoiceRow,
} from './types.js';
export { useBillingContext } from './hooks/useBillingContext.js';
export { useBillingConfig } from './hooks/useBillingConfig.js';
export { useSubscription } from './hooks/useSubscription.js';
export { usePlan } from './hooks/usePlan.js';
export { useFeature } from './hooks/useFeature.js';
export { useUsage } from './hooks/useUsage.js';
export { useRecordUsage } from './hooks/useRecordUsage.js';
export { useCheckout } from './hooks/useCheckout.js';
export { useCustomerPortal } from './hooks/useCustomerPortal.js';
export { usePlanCatalog } from './hooks/usePlanCatalog.js';
export { useInvoices } from './hooks/useInvoices.js';
export { useBillingStripeActions } from './hooks/useBillingStripeActions.js';
export {
  useBillingState,
  type BillingUiState,
  type BillingUiStateKind,
} from './hooks/useBillingState.js';
export { resolveCadence, type BillingCadence } from './utils/cadence.js';
export {
  getRemainingUsage,
  hasExceededLimit,
  getPlanById,
  canUserAccessFeature,
  readPlanFeatureValue,
  isFeatureAccessible,
  type RemainingUsageResult,
} from './billingClient.js';
export type { FeatureGateProps } from './components/FeatureGate.types.js';
export type { UsageIndicatorProps } from './components/UsageIndicator.types.js';
export type { UpgradePromptProps } from './components/UpgradePrompt.types.js';
export type { PricingTableProps } from './components/PricingTable.types.js';
export type { SubscriptionStatusProps } from './components/SubscriptionStatus.types.js';
export type { CustomerPortalLinkProps } from './components/CustomerPortalLink.types.js';
