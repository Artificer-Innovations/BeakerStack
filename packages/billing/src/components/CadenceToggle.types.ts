import type { StyleProp, ViewStyle } from 'react-native';
import type { Plan } from '../types.js';

export type BillingCadence = 'monthly' | 'annual';

export type CadenceToggleProps = {
  cadence: BillingCadence;
  onCadenceChange: (cadence: BillingCadence) => void;
  /** Catalog plans used to compute the annual savings pill (e.g. "2 Months Free"). */
  plans: Plan[];
  style?: StyleProp<ViewStyle>;
};
