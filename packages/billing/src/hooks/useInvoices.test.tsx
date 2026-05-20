import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  baseBillingContextExtras,
  testBillingConfig,
} from '../test/billingFixtures.js';
import type { BillingInvoiceRow } from '../types.js';
import { useInvoices } from './useInvoices.js';

const { range, from, mockSupabase, order } = vi.hoisted(() => {
  const range = vi.fn();
  const order = vi.fn(() => ({ range }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      order,
    })),
  }));
  const mockSupabase = {
    from,
  } as unknown as ReturnType<typeof baseBillingContextExtras>['supabase'];
  return { range, from, mockSupabase, order };
});

const ctxImpl = vi.fn();

vi.mock('./useBillingContext.js', () => ({
  useBillingContext: () => ctxImpl(),
}));

describe('useInvoices', () => {
  beforeEach(() => {
    range.mockReset();
    order.mockClear();
    from.mockClear();
    ctxImpl.mockImplementation(() => ({
      ...baseBillingContextExtras(),
      userId: 'user-1',
      supabase: mockSupabase,
      config: testBillingConfig,
    }));
  });

  it('loads first page', async () => {
    const inv: BillingInvoiceRow = {
      id: 'inv1',
      user_id: 'user-1',
      stripe_invoice_id: 'in_1',
      stripe_customer_id: 'cus',
      stripe_subscription_id: null,
      amount_due: 100,
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      description: null,
      hosted_invoice_url: null,
      invoice_pdf_url: null,
      period_start: null,
      period_end: null,
      created_at: new Date().toISOString(),
      finalized_at: null,
      paid_at: null,
    };
    range.mockResolvedValue({ data: [inv], error: null });
    const { result } = renderHook(() => useInvoices({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    expect(result.current.hasMore).toBe(false);
  });

  it('returns empty list when userId is missing', async () => {
    ctxImpl.mockImplementation(() => ({
      ...baseBillingContextExtras(),
      userId: null,
      supabase: mockSupabase,
      config: testBillingConfig,
    }));
    const { result } = renderHook(() => useInvoices());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('loadMore appends next page when hasMore', async () => {
    const inv1: BillingInvoiceRow = {
      id: 'inv1',
      user_id: 'user-1',
      stripe_invoice_id: 'in_1',
      stripe_customer_id: 'cus',
      stripe_subscription_id: null,
      amount_due: 100,
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      description: null,
      hosted_invoice_url: null,
      invoice_pdf_url: null,
      period_start: null,
      period_end: null,
      created_at: '2026-01-02T00:00:00.000Z',
      finalized_at: null,
      paid_at: null,
    };
    const inv2: BillingInvoiceRow = {
      ...inv1,
      id: 'inv2',
      stripe_invoice_id: 'in_2',
    };
    range
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({ ...inv1, id: `i${i}` })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [inv2], error: null });
    const { result } = renderHook(() => useInvoices({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items.length).toBe(20));
    expect(result.current.hasMore).toBe(true);
    await result.current.loadMore();
    await waitFor(() => expect(result.current.items.length).toBe(21));
    expect(result.current.items[20]?.id).toBe('inv2');
  });

  it('surfaces query errors', async () => {
    range.mockResolvedValue({ data: null, error: new Error('query failed') });
    const { result } = renderHook(() => useInvoices());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.items).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore is a no-op when there is no next page', async () => {
    const inv: BillingInvoiceRow = {
      id: 'inv1',
      user_id: 'user-1',
      stripe_invoice_id: 'in_1',
      stripe_customer_id: 'cus',
      stripe_subscription_id: null,
      amount_due: 100,
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      description: null,
      hosted_invoice_url: null,
      invoice_pdf_url: null,
      period_start: null,
      period_end: null,
      created_at: new Date().toISOString(),
      finalized_at: null,
      paid_at: null,
    };
    range.mockResolvedValue({ data: [inv], error: null });
    const { result } = renderHook(() => useInvoices({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    range.mockClear();
    await result.current.loadMore();
    expect(range).not.toHaveBeenCalled();
  });

  it('refresh reloads first page', async () => {
    const inv: BillingInvoiceRow = {
      id: 'inv1',
      user_id: 'user-1',
      stripe_invoice_id: 'in_1',
      stripe_customer_id: 'cus',
      stripe_subscription_id: null,
      amount_due: 100,
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      description: null,
      hosted_invoice_url: null,
      invoice_pdf_url: null,
      period_start: null,
      period_end: null,
      created_at: new Date().toISOString(),
      finalized_at: null,
      paid_at: null,
    };
    range.mockResolvedValue({ data: [inv], error: null });
    const { result } = renderHook(() => useInvoices({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    range.mockClear();
    await result.current.refresh();
    await waitFor(() => expect(range).toHaveBeenCalled());
    expect(range).toHaveBeenCalledWith(0, 19);
  });
});
