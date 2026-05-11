import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { BillingInvoiceRow } from '@beakerstack/billing';
import BillingInvoicesPage from '../BillingInvoicesPage';

const loadMore = vi.fn();

const invoicesHook = vi.hoisted(() => ({
  items: [] as BillingInvoiceRow[],
  loading: false,
  hasMore: false,
  error: null as Error | string | null,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useInvoices: () => ({
      items: invoicesHook.items,
      loading: invoicesHook.loading,
      hasMore: invoicesHook.hasMore,
      loadMore,
      error: invoicesHook.error,
      refresh: vi.fn(),
    }),
  };
});

vi.mock('@/components/billing/BillingPageShell.web', () => ({
  BillingPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const sampleInvoice = (): BillingInvoiceRow => ({
  id: 'inv_1',
  user_id: 'u1',
  stripe_invoice_id: 'in_1',
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  amount_due: 0,
  amount_paid: 1200,
  currency: 'usd',
  status: 'paid',
  description: 'Invoice',
  hosted_invoice_url: null,
  invoice_pdf_url: null,
  period_start: null,
  period_end: null,
  created_at: '2026-02-01T00:00:00Z',
  finalized_at: null,
  paid_at: null,
});

describe('BillingInvoicesPage', () => {
  beforeEach(() => {
    invoicesHook.items = [];
    invoicesHook.loading = false;
    invoicesHook.hasMore = false;
    invoicesHook.error = null;
    loadMore.mockClear();
  });

  it('renders invoices heading and empty-state hint', () => {
    render(
      <MemoryRouter>
        <BillingInvoicesPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Invoices' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Explore plans/i)).toBeInTheDocument();
  });

  it('shows invoice hook error in an alert', () => {
    invoicesHook.error = new Error('Stripe unavailable');
    render(
      <MemoryRouter>
        <BillingInvoicesPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Stripe unavailable');
  });

  it('lists invoice rows when data is present', () => {
    invoicesHook.items = [sampleInvoice()];
    render(
      <MemoryRouter>
        <BillingInvoicesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByText(/Explore plans/i)).not.toBeInTheDocument();
  });

  it('invokes loadMore from InvoiceTable when there are more pages', async () => {
    const user = userEvent.setup();
    invoicesHook.items = [sampleInvoice()];
    invoicesHook.hasMore = true;
    render(
      <MemoryRouter>
        <BillingInvoicesPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Load more/i }));
    expect(loadMore).toHaveBeenCalled();
  });
});
