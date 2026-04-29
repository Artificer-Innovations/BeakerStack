import type { ReactNode } from 'react';

export type UpgradePromptProps = {
  /** @deprecated Prefer {@link suggestedPlanId} (core spec name). */
  targetTier?: string;
  /** Core spec: plan id to pass to checkout. */
  suggestedPlanId?: string;
  reason: string;
  children?:
    | ReactNode
    | ((ctx: {
        onUpgrade: () => Promise<void>;
        pending: boolean;
      }) => ReactNode);
  className?: string;
  style?: object;
};
