import type { ReactNode } from 'react';
import { BillingConfigReactContext } from './context.js';
import type { ProductBillingConfig } from './schema.js';

export interface BillingConfigProviderProps<C extends ProductBillingConfig> {
  config: C;
  children: ReactNode;
}

export function BillingConfigProvider<C extends ProductBillingConfig>({
  config,
  children,
}: BillingConfigProviderProps<C>) {
  return (
    <BillingConfigReactContext.Provider value={config}>
      {children}
    </BillingConfigReactContext.Provider>
  );
}
