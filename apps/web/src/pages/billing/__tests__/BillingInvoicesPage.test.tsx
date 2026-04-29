import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillingInvoicesPage from '../BillingInvoicesPage';

const loadMore = vi.fn();

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useInvoices: () => ({
      items: [],
      loading: false,
      hasMore: false,
      loadMore,
      error: null,
      refresh: vi.fn(),
    }),
  };
});

vi.mock('@/components/billing/BillingPageShell.web', () => ({
  BillingPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('BillingInvoicesPage', () => {
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
});
