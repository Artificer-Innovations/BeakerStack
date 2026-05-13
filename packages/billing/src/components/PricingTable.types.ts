export type PricingTableProps = {
  /** @deprecated Prefer {@link onCheckout} (core spec name). */
  onSelectPlan?: (planId: string) => void;
  /** Core spec: invoked when user chooses a paid plan for checkout. */
  onCheckout?: (planId: string) => void;
  /** @deprecated Prefer {@link highlightPlanId} or keep for "highlight current user's plan". */
  highlightCurrent?: boolean;
  /** Core spec: highlight this plan id in the list when it matches a row. */
  highlightPlanId?: string | null;
  /**
   * When false, suppresses current-plan highlighting and changes the action button
   * label to "Get started" (appropriate for unauthenticated landing page contexts).
   * Defaults to true.
   */
  isAuthenticated?: boolean;
  /**
   * Core spec surface; optional for analytics. Catalog is scoped by `BillingProvider` config.
   */
  productId?: string;
  /** Core spec surface; reserved for future use (e.g. admin viewing another user). */
  currentUserId?: string | null;
  /**
   * When set, only plans with a matching `billing_period` (or free plans with
   * `price_cents === 0`) are shown. Omit to show all plans.
   */
  cadence?: 'monthly' | 'annual';
  className?: string;
  style?: object;
};
