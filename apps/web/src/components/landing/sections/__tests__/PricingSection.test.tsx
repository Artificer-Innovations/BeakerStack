import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { LandingConfig } from '../../../../config/landing';
import { PricingSection } from '../PricingSection';

const mockNavigate = vi.hoisted(() => vi.fn());
const getCadenceFromSearchMock = vi.hoisted(() =>
  vi.fn((_search: URLSearchParams): 'monthly' | 'annual' => 'monthly')
);
const getStaticPlansMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@beakerstack/billing', () => ({
  BillingConfigProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('../../../../billing/staticPlanAdapter', () => ({
  getStaticPlans: getStaticPlansMock,
}));

vi.mock('../../../billing/PlanCard.web', () => ({
  PlanCard: ({
    plan,
    primary,
  }: {
    plan: { id: string; display_name: string };
    primary: { label: string; onClick: () => void };
  }) => (
    <button
      type='button'
      data-testid={`plan-card-${plan.id}`}
      onClick={primary.onClick}
    >
      {plan.display_name}
    </button>
  ),
}));

vi.mock('../../../billing/CadenceToggle.web', () => ({
  CadenceToggle: () => <div data-testid='cadence-toggle'>Toggle</div>,
  getCadenceFromSearch: (search: URLSearchParams) =>
    getCadenceFromSearchMock(search),
}));

vi.mock('../../../../billing/billingSyncDisplay', () => ({
  annualListCentsFromSync: vi.fn(() => 22800),
  planAnnualSavingsCopy: vi.fn(() => ({ kind: 'months', months: 2 })),
  formatSavingsCalloutFromCopy: vi.fn(() => '2 Months Free'),
}));

const mockPlans = [
  { id: 'free', display_name: 'Free', price_cents: 0, features: {} },
  { id: 'pro', display_name: 'Pro', price_cents: 1900, features: {} },
  { id: 'team', display_name: 'Team', price_cents: 4900, features: {} },
];

const baseConfig: LandingConfig['pricing'] = {
  heading: 'Simple, transparent pricing',
  subhead: 'Start free. Scale as you grow.',
};

function renderSection(config: LandingConfig['pricing'] = baseConfig) {
  return render(
    <MemoryRouter>
      <PricingSection config={config} />
    </MemoryRouter>
  );
}

describe('PricingSection', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    getCadenceFromSearchMock.mockReturnValue('monthly');
    getStaticPlansMock.mockReturnValue(mockPlans);
  });

  it('renders heading and subhead', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Simple, transparent pricing' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start free. Scale as you grow.')
    ).toBeInTheDocument();
  });

  it('renders the cadence toggle', () => {
    renderSection();
    expect(screen.getByTestId('cadence-toggle')).toBeInTheDocument();
  });

  it('renders a plan card for each static plan immediately (no loading state)', () => {
    renderSection();
    expect(screen.getByTestId('plan-card-free')).toHaveTextContent('Free');
    expect(screen.getByTestId('plan-card-pro')).toHaveTextContent('Pro');
    expect(screen.getByTestId('plan-card-team')).toHaveTextContent('Team');
  });

  it('navigates to signup with encoded plan id', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId('plan-card-pro'));
    expect(mockNavigate).toHaveBeenCalledWith('/signup?plan=pro');
  });

  it('appends cadence=annual when annual pricing is selected', async () => {
    const user = userEvent.setup();
    getCadenceFromSearchMock.mockReturnValue('annual');
    renderSection();
    await user.click(screen.getByTestId('plan-card-pro'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/signup?plan=pro&cadence=annual'
    );
  });

  it('renders disclaimer when provided', () => {
    renderSection({
      ...baseConfig,
      disclaimer: 'Prices in USD. Cancel anytime.',
    });
    expect(
      screen.getByText('Prices in USD. Cancel anytime.')
    ).toBeInTheDocument();
  });

  it('does not render disclaimer when absent', () => {
    renderSection();
    expect(screen.queryByText(/Cancel anytime/)).not.toBeInTheDocument();
  });
});
