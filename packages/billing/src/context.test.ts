import { describe, expect, it } from 'vitest';
import { BillingConfigReactContext, BillingReactContext } from './context.js';

describe('billing react contexts', () => {
  it('exports context objects with Provider and Consumer', () => {
    expect(BillingReactContext.Provider).toBeDefined();
    expect(BillingReactContext.Consumer).toBeDefined();
    expect(BillingConfigReactContext.Provider).toBeDefined();
    expect(BillingConfigReactContext.Consumer).toBeDefined();
  });
});
