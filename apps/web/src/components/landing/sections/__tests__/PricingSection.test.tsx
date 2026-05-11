import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PricingSection } from '../PricingSection';

vi.mock('@beakerstack/billing', () => ({
  BillingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePlanCatalog: vi.fn(),
}));
vi.mock('../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../../billing/beakerstackBillingConfig', () => ({
  beakerstackBillingConfig: { plans: [] },
}));
vi.mock('../../billing/PlanCard.web', () => ({
  PlanCard: ({ plan }: { plan: { display_name: string } }) => (
    <div data-testid='plan-card'>{plan.display_name}</div>
  ),
}));
vi.mock('../../billing/CadenceToggle.web', () => ({
  CadenceToggle: () => <div data-testid='cadence-toggle'>Toggle</div>,
  getCadenceFromSearch: vi.fn(() => 'monthly'),
}));
vi.mock('../../../billing/billingSyncDisplay', () => ({
  annualListCentsFromSync: vi.fn(() => 22800),
  planAnnualSavingsCopy: vi.fn(() => null),
  formatSavingsCalloutFromCopy: vi.fn(() => null),
}));

import { usePlanCatalog } from '@beakerstack/billing';

const mockPlans = [
  { id: 'free', display_name: 'Free', price_cents: 0, features: [] },
  { id: 'pro', display_name: 'Pro', price_cents: 1900, features: [] },
  { id: 'team', display_name: 'Team', price_cents: 4900, features: [] },
];

const baseConfig = {
  heading: 'Simple, transparent pricing',
  subhead: 'Start free. Scale as you grow.',
};

function renderSection(config = baseConfig) {
  return render(
    <MemoryRouter>
      <PricingSection config={config} />
    </MemoryRouter>
  );
}

describe('PricingSection', () => {
  beforeEach(() => {
    vi.mocked(usePlanCatalog).mockReturnValue({ plans: mockPlans, loading: false } as ReturnType<typeof usePlanCatalog>);
  });

  it('renders heading and subhead', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Simple, transparent pricing' })
    ).toBeInTheDocument();
    expect(screen.getByText('Start free. Scale as you grow.')).toBeInTheDocument();
  });

  it('renders the cadence toggle', () => {
    renderSection();
    expect(screen.getByTestId('cadence-toggle')).toBeInTheDocument();
  });

  it('renders a plan card for each plan', () => {
    renderSection();
    const cards = screen.getAllByTestId('plan-card');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Free');
    expect(cards[1]).toHaveTextContent('Pro');
    expect(cards[2]).toHaveTextContent('Team');
  });

  it('shows loading message while plans are loading', () => {
    vi.mocked(usePlanCatalog).mockReturnValue({ plans: [], loading: true } as ReturnType<typeof usePlanCatalog>);
    renderSection();
    expect(screen.getByText(/Loading plans/)).toBeInTheDocument();
    expect(screen.queryByTestId('plan-card')).not.toBeInTheDocument();
  });

  it('renders disclaimer when provided', () => {
    renderSection({ ...baseConfig, disclaimer: 'Prices in USD. Cancel anytime.' });
    expect(screen.getByText('Prices in USD. Cancel anytime.')).toBeInTheDocument();
  });

  it('does not render disclaimer when absent', () => {
    renderSection();
    expect(screen.queryByText(/Cancel anytime/)).not.toBeInTheDocument();
  });
});
