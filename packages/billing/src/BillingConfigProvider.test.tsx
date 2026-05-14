import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BillingConfigProvider } from './BillingConfigProvider.js';
import { useBillingConfig } from './hooks/useBillingConfig.js';
import { defineBillingConfig } from './schema.js';

const testConfig = defineBillingConfig({
  productId: 'test',
  displayName: 'Test Product',
  plans: [
    {
      id: 'test_free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      features: {},
      usageLimits: {},
    },
  ],
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <BillingConfigProvider config={testConfig}>{children}</BillingConfigProvider>
  );
}

describe('BillingConfigProvider', () => {
  it('provides config via useBillingConfig', () => {
    const { result } = renderHook(() => useBillingConfig(), { wrapper });
    expect(result.current.productId).toBe('test');
    expect(result.current.displayName).toBe('Test Product');
  });

  it('exposes plans array from config', () => {
    const { result } = renderHook(() => useBillingConfig(), { wrapper });
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].id).toBe('test_free');
  });

  it('throws when used outside BillingConfigProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useBillingConfig())).toThrow(
        'useBillingConfig must be used within BillingProvider'
      );
    } finally {
      spy.mockRestore();
    }
  });
});
