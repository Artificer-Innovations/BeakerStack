import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { BillingConfigReactContext, BillingReactContext } from '../context.js';
import {
  baseBillingContextExtras,
  testBillingConfig,
  testSubscription,
} from '../test/billingFixtures.js';
import type { BillingContextValue } from '../types.js';
import { useBillingConfig } from './useBillingConfig.js';
import { useBillingContext } from './useBillingContext.js';

function configWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BillingConfigReactContext.Provider value={testBillingConfig}>
      {children}
    </BillingConfigReactContext.Provider>
  );
}

function billingWrapper(ctx: BillingContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BillingReactContext.Provider value={ctx}>
        {children}
      </BillingReactContext.Provider>
    );
  };
}

describe('useBillingConfig', () => {
  it('returns config from provider', () => {
    const { result } = renderHook(() => useBillingConfig(), {
      wrapper: configWrapper,
    });
    expect(result.current.productId).toBe('test_product');
  });

  it('throws outside BillingConfigReactContext', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBillingConfig())).toThrow(
      /useBillingConfig must be used within BillingProvider/
    );
    spy.mockRestore();
  });
});

describe('useBillingContext', () => {
  const ctx: BillingContextValue = {
    ...baseBillingContextExtras(),
    subscription: testSubscription(),
    subscriptionLoading: false,
  };

  it('returns billing context', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: billingWrapper(ctx),
    });
    expect(result.current.subscription?.id).toBe('sub_1');
    expect(result.current.refreshSubscription).toBeTypeOf('function');
  });

  it('throws outside BillingReactContext', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBillingContext())).toThrow(
      /useBillingContext must be used within BillingProvider/
    );
    spy.mockRestore();
  });
});
