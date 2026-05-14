import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import { CadenceToggle } from '../CadenceToggle.web';

// When static plans are provided, usePlanCatalog must never be invoked.
vi.mock('@beakerstack/billing', () => ({
  usePlanCatalog: vi.fn(() => {
    throw new Error('usePlanCatalog must not be called when plans prop is provided');
  }),
}));

vi.mock('../../../billing/billingSyncDisplay', () => ({
  cadenceAnnualSavingsFromPlans: vi.fn(() => ({ kind: 'none' as const })),
  formatCadenceToggleSavingsBadge: vi.fn(() => null),
}));

const mockPlans: Plan[] = [
  {
    id: 'free',
    product_id: 'test',
    display_name: 'Free',
    description: null,
    price_cents: 0,
    billing_period: 'free',
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_product_id: null,
    features: {},
    usage_limits: {},
    trial_period_days: 0,
    is_public: true,
    display_order: 1,
  },
  {
    id: 'pro',
    product_id: 'test',
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
  },
];

describe('CadenceToggle with static plans', () => {
  it('renders without calling usePlanCatalog when plans prop is provided', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <CadenceToggle plans={mockPlans} />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it('renders Monthly and Annually buttons', () => {
    render(
      <MemoryRouter>
        <CadenceToggle plans={mockPlans} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annually/i })).toBeInTheDocument();
  });
});
