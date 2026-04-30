import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { BillingReactContext } from '../context.js';
import {
  baseBillingContextExtras,
  testSubscription,
} from '../test/billingFixtures.js';
import type { BillingContextValue } from '../types.js';
import { useSubscription } from './useSubscription.js';

function makeWrapper(ctx: BillingContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BillingReactContext.Provider value={ctx}>
        {children}
      </BillingReactContext.Provider>
    );
  };
}

describe('useSubscription', () => {
  it('exposes subscription row and refresh', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const sub = testSubscription({ status: 'trialing' });
    const ctx: BillingContextValue = {
      ...baseBillingContextExtras(),
      subscription: sub,
      subscriptionLoading: false,
      subscriptionError: null,
      refreshSubscription: refresh,
    };
    const { result } = renderHook(() => useSubscription(), {
      wrapper: makeWrapper(ctx),
    });
    expect(result.current.data).toEqual(sub);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    void result.current.refresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reflects loading and error from context', () => {
    const ctx: BillingContextValue = {
      ...baseBillingContextExtras(),
      subscription: null,
      subscriptionLoading: true,
      subscriptionError: { kind: 'network', message: 'offline' },
      refreshSubscription: vi.fn(),
    };
    const { result } = renderHook(() => useSubscription(), {
      wrapper: makeWrapper(ctx),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error?.kind).toBe('network');
  });
});
