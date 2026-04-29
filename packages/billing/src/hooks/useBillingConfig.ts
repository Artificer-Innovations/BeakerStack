import { useContext } from 'react';
import { BillingConfigReactContext } from '../context.js';
import type { ProductBillingConfig } from '../schema.js';

export function useBillingConfig<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): P {
  const v = useContext(BillingConfigReactContext) as P | null;
  if (!v) {
    throw new Error('useBillingConfig must be used within BillingProvider');
  }
  return v;
}
