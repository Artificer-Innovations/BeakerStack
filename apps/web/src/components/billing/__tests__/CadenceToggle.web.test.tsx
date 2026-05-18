import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import { CadenceToggle, getCadenceFromSearch } from '../CadenceToggle.web';

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

const catalogPlans = vi.fn(() => ({
  plans: [proPlan] as Plan[],
  loading: false,
  error: null,
  refresh: vi.fn(),
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    usePlanCatalog: () => catalogPlans(),
  };
});

describe('getCadenceFromSearch', () => {
  it('defaults to monthly when absent', () => {
    expect(getCadenceFromSearch(new URLSearchParams())).toBe('monthly');
    expect(getCadenceFromSearch(new URLSearchParams('cadence=monthly'))).toBe(
      'monthly'
    );
  });

  it('detects annual', () => {
    expect(getCadenceFromSearch(new URLSearchParams('cadence=annual'))).toBe(
      'annual'
    );
  });
});

describe('CadenceToggle', () => {
  it('renders monthly / annually controls', () => {
    render(
      <MemoryRouter initialEntries={['/billing/plans']}>
        <CadenceToggle />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Annually/i })
    ).toBeInTheDocument();
  });

  it('syncs cadence to URL and shows savings pill on annual selection', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/billing/plans?cadence=annual']}>
        <CadenceToggle />
      </MemoryRouter>
    );
    const annualBtn = screen.getByRole('button', { name: /Annually/i });
    expect(annualBtn.className).toMatch(/indigo-600/);
    const pill = container.querySelector('.border-amber-400');
    expect(pill).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.getByRole('button', { name: 'Monthly' }).className).toMatch(
      /indigo-600/
    );

    await user.click(screen.getByRole('button', { name: /Annually/i }));
    expect(screen.getByRole('button', { name: /Annually/i }).className).toMatch(
      /indigo-600/
    );
  });

  it('selects annual from default monthly URL', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/billing/plans']}>
        <CadenceToggle />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Annually/i }));
    expect(screen.getByRole('button', { name: /Annually/i }).className).toMatch(
      /indigo-600/
    );
  });

  it('preserves URL hash when toggling cadence (regression: #275)', async () => {
    const user = userEvent.setup();
    let capturedHash = '';
    function HashSpy() {
      capturedHash = useLocation().hash;
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/#pricing']}>
        <CadenceToggle plans={[proPlan]} />
        <HashSpy />
      </MemoryRouter>
    );
    expect(capturedHash).toBe('#pricing');

    await user.click(screen.getByRole('button', { name: /Annually/i }));
    expect(capturedHash).toBe('#pricing');

    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(capturedHash).toBe('#pricing');
  });
});
