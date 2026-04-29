export type PricingTableProps = {
  /** @deprecated Prefer {@link onCheckout} (core spec name). */
  onSelectPlan?: (planId: string) => void;
  /** Core spec: invoked when user chooses a paid plan for checkout. */
  onCheckout?: (planId: string) => void;
  /** @deprecated Prefer {@link highlightPlanId} or keep for “highlight current user’s plan”. */
  highlightCurrent?: boolean;
  /** Core spec: highlight this plan id in the list when it matches a row. */
  highlightPlanId?: string | null;
  /**
   * Core spec surface; optional for analytics. Catalog is scoped by `BillingProvider` config.
   */
  productId?: string;
  /** Core spec surface; reserved for future use (e.g. admin viewing another user). */
  currentUserId?: string | null;
  className?: string;
  style?: object;
};
