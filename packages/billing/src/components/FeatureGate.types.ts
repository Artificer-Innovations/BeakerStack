import type { ReactNode } from 'react';
import type { InferFeatureKeys } from '../schema.js';
import type { ProductBillingConfig } from '../schema.js';

export type FeatureGateProps<P extends ProductBillingConfig> = {
  /** @deprecated Prefer {@link featureName} (core spec name). */
  feature?: InferFeatureKeys<P> & string;
  /** Core spec: entitlement key on the current plan. */
  featureName?: InferFeatureKeys<P> & string;
  fallback: ReactNode;
  children: ReactNode;
  className?: string;
  style?: object;
};
