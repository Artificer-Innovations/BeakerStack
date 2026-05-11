import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PricingSection } from '../PricingSection';

const mockUsePlanCatalog = vi.fn();

vi.mock('@beakerstack/billing', () => ({
  BillingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePlanCatalog: () => mockUsePlanCatalog(),
}));

vi.mock('../../../../lib/supabase', () => ({ supabase: {} }));

vi.mock('../../../../billing/beakerstackBillingConfig', () => ({
  beakerstackBillingConfig: {},
}));

vi.mock('../../../billing/PlanCard.web', () => ({
  PlanCard: ({
    plan,
    priceHeadline,
  }: {
    plan: { display_name: string };
    priceHeadline: string;
  }) => (
    <div data-testid='plan-card'>
      <span>{plan.display_name}</span>
      <span>{priceHeadline}</span>
    </div>
  ),
}));

const fakePlans = [
  { id: 'plan_free', display_name: 'Free', price_cents: 0, trial_period_days: 0 },
  { id: 'plan_pro', display_name: 'Pro', price_cents: 1900, trial_period_days: 0 },
];

const base = {
  heading: 'Simple pricing.',
  subhead: 'No surprises.',
};

function renderSection(overrides = {}) {
  return render(
    <MemoryRouter>
      <PricingSection config={{ ...base, ...overrides }} />
    </MemoryRouter>
  );
}

describe('PricingSection', () => {
  beforeEach(() => {
    mockUsePlanCatalog.mockReturnValue({ plans: fakePlans, loading: false });
  });

  it('renders section heading and subhead', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: 'Simple pricing.' })).toBeInTheDocument();
    expect(screen.getByText('No surprises.')).toBeInTheDocument();
  });

  it('renders disclaimer when provided', () => {
    renderSection({ disclaimer: 'Prices exclude VAT.' });
    expect(screen.getByText('Prices exclude VAT.')).toBeInTheDocument();
  });

  it('does not render disclaimer when absent', () => {
    renderSection();
    expect(screen.queryByText('Prices exclude VAT.')).not.toBeInTheDocument();
  });

  it('renders loading indicator while plans load', () => {
    mockUsePlanCatalog.mockReturnValue({ plans: [], loading: true });
    renderSection();
    expect(screen.getByText(/loading plans/i)).toBeInTheDocument();
  });

  it('renders a PlanCard for each plan', () => {
    renderSection();
    expect(screen.getAllByTestId('plan-card')).toHaveLength(2);
  });

  it('shows US$0 price for free plan', () => {
    renderSection();
    expect(screen.getByText('US$0')).toBeInTheDocument();
  });
});
