import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { BillingInvoiceRow } from '@beakerstack/billing';
import { ConstraintWarning } from '../ConstraintWarning.web';
import { StatCard } from '../StatCard.web';
import { StatusBadge } from '../StatusBadge.web';
import { FeatureLimitRow } from '../FeatureLimitRow.web';
import { PlanFeatureRow } from '../PlanFeatureRow.web';
import { InvoiceList } from '../InvoiceList.web';
import { InvoiceTable } from '../InvoiceTable.web';
import { ConfirmDowngradeModal } from '../ConfirmDowngradeModal.web';

vi.mock('@beakerstack/shared/components/primitives/Modal.web', () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <div role='dialog' aria-label={title}>
        {children}
      </div>
    ) : null,
}));

vi.mock('@beakerstack/shared/components/primitives/Button.web', () => ({
  Button: (p: { children: React.ReactNode; onPress?: () => void }) => (
    <button type='button' onClick={p.onPress}>
      {p.children}
    </button>
  ),
}));

vi.mock('@beakerstack/shared/components/primitives/Skeleton.web', () => ({
  Skeleton: () => <div data-testid='skeleton' />,
}));

const sampleInvoice = (): BillingInvoiceRow => ({
  id: 'inv_1',
  user_id: 'u1',
  stripe_invoice_id: 'in_1',
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  amount_due: 1000,
  amount_paid: 1000,
  currency: 'usd',
  status: 'paid',
  description: 'Subscription',
  hosted_invoice_url: null,
  invoice_pdf_url: null,
  period_start: null,
  period_end: null,
  created_at: new Date().toISOString(),
  finalized_at: null,
  paid_at: new Date().toISOString(),
});

describe('billing presentational components', () => {
  it('StatCard renders label and value', () => {
    render(<StatCard label='Test' value='42' />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('StatusBadge maps known statuses', () => {
    render(<StatusBadge status='paid' />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('ConstraintWarning renders message', () => {
    render(<ConstraintWarning message='Blocked' />);
    expect(screen.getByRole('status')).toHaveTextContent('Blocked');
  });

  it('FeatureLimitRow shows unlimited and capped states', () => {
    const { rerender } = render(
      <FeatureLimitRow name='AI' used={2} cap={10} capIsUnlimited={false} />
    );
    expect(screen.getByText('2 of 10')).toBeInTheDocument();
    rerender(<FeatureLimitRow name='X' used={1} cap={1} capIsUnlimited />);
    expect(screen.getByText(/1 of unlimited/)).toBeInTheDocument();
  });

  it('PlanFeatureRow shows upgrade link when locked', () => {
    render(
      <MemoryRouter>
        <PlanFeatureRow name='Pro feature' available={false} showUpgradeLink />
      </MemoryRouter>
    );
    expect(screen.getByText('Upgrade to unlock')).toBeInTheDocument();
  });

  it('InvoiceList renders items and view-all link', () => {
    const inv = sampleInvoice();
    render(
      <MemoryRouter>
        <InvoiceList items={[inv]} limit={3} />
      </MemoryRouter>
    );
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('View all invoices →')).toBeInTheDocument();
  });

  it('InvoiceList returns null when there are no invoices', () => {
    render(
      <MemoryRouter>
        <InvoiceList items={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Recent activity')).not.toBeInTheDocument();
  });

  it('InvoiceList omits view-all link when showViewAll is false', () => {
    const inv = sampleInvoice();
    render(
      <MemoryRouter>
        <InvoiceList items={[inv]} showViewAll={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /View all invoices/i })
    ).not.toBeInTheDocument();
  });

  it('InvoiceList uses description fallback and amount_due when paid is zero', () => {
    const inv: BillingInvoiceRow = {
      ...sampleInvoice(),
      description: null,
      amount_paid: 0,
      amount_due: 2500,
    };
    render(
      <MemoryRouter>
        <InvoiceList items={[inv]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
  });

  it('InvoiceTable shows empty, loading, and row states', () => {
    const { rerender } = render(
      <MemoryRouter>
        <InvoiceTable items={[]} loading hasMore={false} onLoadMore={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <InvoiceTable
          items={[]}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/No invoices yet/i)).toBeInTheDocument();
    const inv = sampleInvoice();
    rerender(
      <MemoryRouter>
        <InvoiceTable
          items={[inv]}
          loading={false}
          hasMore
          onLoadMore={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('ConfirmDowngradeModal shows actions when open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDowngradeModal
        open
        onClose={onClose}
        onConfirm={onConfirm}
        planName='Free'
        bodyText='Body'
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Body')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
