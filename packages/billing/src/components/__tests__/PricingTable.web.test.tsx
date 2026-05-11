import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingTable } from '../PricingTable.web';

vi.mock('../../hooks/usePlanCatalog.js', () => ({
  usePlanCatalog: () => ({
    plans: [
      {
        id: 'plan_free',
        display_name: 'Free',
        price_cents: 0,
        billing_period: 'free',
      },
      {
        id: 'plan_pro',
        display_name: 'Pro',
        price_cents: 1900,
        billing_period: 'monthly',
      },
    ],
    loading: false,
  }),
}));

vi.mock('../../hooks/usePlan.js', () => ({
  usePlan: () => ({ data: { id: 'plan_pro' } }),
}));

describe('PricingTable', () => {
  it('shows "Select" buttons when authenticated', () => {
    render(<PricingTable isAuthenticated={true} onCheckout={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(2);
  });

  it('shows "Get started" buttons when unauthenticated', () => {
    render(<PricingTable isAuthenticated={false} onCheckout={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Get started' })).toHaveLength(
      2
    );
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull();
  });

  it('suppresses current-plan highlight when unauthenticated', () => {
    const { container } = render(
      <PricingTable
        isAuthenticated={false}
        highlightCurrent={true}
        onCheckout={() => {}}
      />
    );
    const items = container.querySelectorAll('li');
    items.forEach(li => {
      expect(li.style.border).not.toContain('#3b82f6');
    });
  });

  it('fires onCheckout with planId when Get started is clicked', async () => {
    const onCheckout = vi.fn();
    render(<PricingTable isAuthenticated={false} onCheckout={onCheckout} />);
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Get started' })[1]
    );
    expect(onCheckout).toHaveBeenCalledWith('plan_pro');
  });
});
