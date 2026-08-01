export type WaitlistBillingConfig = {
  productId: string;
  compPlanIds: readonly string[];
  defaultCompPlanId?: string;
};

export type FulfillWaitlistConversionResult = {
  ok?: boolean;
  error?: string;
  comp_applied?: boolean;
  plan_applied?: boolean;
  unchanged?: boolean;
};
