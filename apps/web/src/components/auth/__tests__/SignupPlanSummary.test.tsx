import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import type { PlanSavingsCopy } from '../../../billing/billingSyncDisplay';
import { LoginPlanSummary, SignupPlanSummary } from '../SignupPlanSummary';

const proPlan: Plan = {
  id: 'beakerstack_pro',
  product_id: 'beakerstack',
  display_name: 'Pro',
  description: null,
  price_cents: 1900,
  billing_period: 'monthly',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: {},
  usage_limits: {},
  trial_period_days: 0,
  is_public: true,
  display_order: 2,
};

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    usePlanCatalog: vi.fn(),
  };
});

vi.mock('../../billing/CadenceToggle.web', () => ({
  getCadenceFromSearch: vi.fn(() => 'monthly'),
}));

vi.mock('../../../billing/billingSyncDisplay', () => ({
  annualListCentsFromSync: vi.fn(() => 22_800),
  formatSavingsCalloutFromCopy: vi.fn((copy: PlanSavingsCopy) =>
    copy.kind === 'percent' ? `(Save ~${copy.pct}%)` : ''
  ),
  planAnnualSavingsCopy: vi.fn(
    (): PlanSavingsCopy => ({
      kind: 'none',
    })
  ),
}));

import { usePlanCatalog } from '@beakerstack/billing';
import { getCadenceFromSearch } from '../../billing/CadenceToggle.web';
import * as billingSync from '../../../billing/billingSyncDisplay';

describe('PlanIntentSummary', () => {
  beforeEach(() => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [proPlan],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(getCadenceFromSearch).mockReturnValue('monthly');
    vi.mocked(billingSync.planAnnualSavingsCopy).mockReturnValue({
      kind: 'none',
    });
  });

  it('renders nothing when plan query is missing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/signup']}>
        <SignupPlanSummary />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading placeholder while catalog loads', () => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/signup?plan=beakerstack_pro']}>
        <SignupPlanSummary />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading plan/i)).toBeInTheDocument();
  });

  it('renders signup selection card with pricing and bullets', () => {
    render(
      <MemoryRouter initialEntries={['/signup?plan=beakerstack_pro']}>
        <SignupPlanSummary />
      </MemoryRouter>
    );
    expect(screen.getByText('Your selection')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText(/per month/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature A/i)).toBeInTheDocument();
  });

  it('shows savings callout when annual cadence and copy exists', () => {
    vi.mocked(getCadenceFromSearch).mockReturnValue('annual');
    vi.mocked(billingSync.planAnnualSavingsCopy).mockReturnValue({
      kind: 'percent',
      pct: 17,
    });
    render(
      <MemoryRouter
        initialEntries={['/signup?plan=beakerstack_pro&cadence=annual']}
      >
        <SignupPlanSummary />
      </MemoryRouter>
    );
    expect(screen.getByText(/\(Save ~17%\)/)).toBeInTheDocument();
    expect(screen.getByText(/per year, billed annually/i)).toBeInTheDocument();
  });

  it('returns null when catalog row is non-paid', () => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [{ ...proPlan, price_cents: 0 }],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/signup?plan=beakerstack_pro']}>
        <SignupPlanSummary />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('uses compact login styling and fewer bullets', () => {
    render(
      <MemoryRouter initialEntries={['/login?plan=beakerstack_pro']}>
        <LoginPlanSummary />
      </MemoryRouter>
    );
    expect(screen.getByText('Plan from pricing')).toBeInTheDocument();
    const bullets = screen.getAllByRole('listitem');
    expect(bullets.length).toBeLessThanOrEqual(2);
  });
});
