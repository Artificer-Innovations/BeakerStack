import { createContext } from 'react';
import type { BillingContextValue } from './types.js';
import type { ProductBillingConfig } from './schema.js';

export const BillingReactContext =
  createContext<BillingContextValue<ProductBillingConfig> | null>(null);

export const BillingConfigReactContext =
  createContext<ProductBillingConfig | null>(null);
