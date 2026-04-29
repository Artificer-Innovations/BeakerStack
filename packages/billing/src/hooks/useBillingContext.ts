import { useContext } from 'react';
import { BillingReactContext } from '../context.js';
import type { ProductBillingConfig } from '../schema.js';
import type { BillingContextValue } from '../types.js';

export function useBillingContext<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): BillingContextValue<P> {
  const v = useContext(BillingReactContext) as BillingContextValue<P> | null;
  if (!v) {
    throw new Error('useBillingContext must be used within BillingProvider');
  }
  return v;
}
