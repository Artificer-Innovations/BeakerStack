import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import { useCustomerPortal } from './useCustomerPortal.js';

const { invoke, mockSupabase, refreshSubscription } = vi.hoisted(() => {
  const invoke = vi.fn();
  const refreshSubscription = vi.fn().mockResolvedValue(undefined);
  const mockSupabase = {
    functions: { invoke },
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { invoke, mockSupabase, refreshSubscription };
});

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ({
    ...baseBillingContextExtras(),
    supabase: mockSupabase,
    config: testBillingConfig,
    portalReturnUrl: 'https://return',
    stripeFunctionName: 'billing-stripe',
    refreshSubscription,
  }),
}));

describe('useCustomerPortal', () => {
  beforeEach(() => {
    invoke.mockReset();
    // Plain object avoids jsdom "Not implemented: navigation" on `location.href = url`
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' } as unknown as Location,
    });
  });

  it('returns portal url on success', async () => {
    invoke.mockResolvedValue({
      data: { url: 'https://billing.stripe/session' },
      error: null,
    });
    const { result } = renderHook(() => useCustomerPortal());
    const url = await result.current.openPortal();
    expect(url).toBe('https://billing.stripe/session');
    expect(invoke).toHaveBeenCalledWith(
      'billing-stripe',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'portal' }),
      })
    );
  });

  it('returns null when url missing', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useCustomerPortal());
    const url = await result.current.openPortal();
    expect(url).toBeNull();
    await waitFor(() => expect(result.current.error?.kind).toBe('stripe'));
  });
});
