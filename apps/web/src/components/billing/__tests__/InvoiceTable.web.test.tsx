import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { BillingInvoiceRow } from '@beakerstack/billing';
import type { ReactElement } from 'react';
import { InvoiceTable } from '../InvoiceTable.web';

function renderTable(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock('@beakerstack/billing/presentation', () => ({
  formatDate: (iso: string) => `D:${iso.slice(0, 10)}`,
  formatMoneyCents: (cents: number, currency?: string) =>
    `${currency ?? 'usd'}:${cents}`,
}));

describe('InvoiceTable', () => {
  const baseRow = (): BillingInvoiceRow => ({
    id: 'inv_1',
    user_id: 'u1',
    stripe_invoice_id: 'in_1',
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
    amount_due: 0,
    amount_paid: 1000,
    currency: 'usd',
    status: 'paid',
    description: 'Subscription',
    hosted_invoice_url: 'https://stripe.example/i',
    invoice_pdf_url: 'https://stripe.example/p.pdf',
    period_start: null,
    period_end: null,
    created_at: '2026-01-15T12:00:00Z',
    finalized_at: null,
    paid_at: null,
  });

  it('shows skeleton when loading with no items', () => {
    const { container } = renderTable(
      <InvoiceTable items={[]} loading hasMore={false} onLoadMore={vi.fn()} />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when not loading and no items', () => {
    renderTable(
      <InvoiceTable
        items={[]}
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText(/No invoices yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View plans/i })).toHaveAttribute(
      'href',
      '/billing/plans'
    );
  });

  it('renders rows with links when urls exist', () => {
    renderTable(
      <InvoiceTable
        items={[baseRow()]}
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      'https://stripe.example/i'
    );
    expect(screen.getByRole('link', { name: 'PDF' })).toHaveAttribute(
      'href',
      'https://stripe.example/p.pdf'
    );
  });

  it('uses amount_due when amount_paid is zero', () => {
    renderTable(
      <InvoiceTable
        items={[
          {
            ...baseRow(),
            amount_paid: 0,
            amount_due: 2500,
          },
        ]}
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText('usd:2500')).toBeInTheDocument();
  });

  it('shows em dash when description is missing', () => {
    renderTable(
      <InvoiceTable
        items={[{ ...baseRow(), description: null }]}
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onLoadMore when Load more is pressed', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    renderTable(
      <InvoiceTable
        items={[baseRow()]}
        loading={false}
        hasMore
        onLoadMore={onLoadMore}
      />
    );
    await user.click(screen.getByRole('button', { name: /Load more/i }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});
