import type { StyleProp, ViewStyle } from 'react-native';
import type { Plan } from '../types.js';
import type { ProductBillingConfig } from '../schema.js';

export type PlanFeatureListProps<
  _P extends ProductBillingConfig = ProductBillingConfig,
> = {
  plan: Plan;
  style?: StyleProp<ViewStyle>;
  /** Reserved for future public pricing copy differences. */
  mode?: 'authenticated' | 'public';
};
