import type { InferMeterKeys } from '../schema.js';
import type { ProductBillingConfig } from '../schema.js';

export type UsageIndicatorProps<P extends ProductBillingConfig> = {
  meter: InferMeterKeys<P> & string;
  variant?: 'bar' | 'text' | 'compact' | 'expanded';
  /** Used with `variant="expanded"`. */
  label?: string;
  /** Shown under the label in expanded layout. */
  description?: string;
  className?: string;
  style?: object;
};
