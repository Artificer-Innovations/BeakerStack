import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Plan } from '@beakerstack/billing';
import { beakerstackBillingConfig } from '@/billing/beakerstackBillingConfig';
import { PlanCard, listPriceForPlan } from '../PlanCard.web';

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingConfig: () => beakerstackBillingConfig,
  };
});

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
  features: {
    feature_a: true,
    feature_b: false,
    containers_per_account_max: -1,
    items_per_container_max: 25,
  },
  usage_limits: { ai_summarize: 500 },
  trial_period_days: 0,
  is_public: true,
  display_order: 2,
};

describe('listPriceForPlan', () => {
  it('formats free and paid cadence copy', () => {
    const free: Plan = { ...proPlan, id: 'beakerstack_free', price_cents: 0 };
    expect(listPriceForPlan(free, 'monthly')).toBe('$0');
    expect(listPriceForPlan(proPlan, 'monthly')).toMatch(/19/);
    expect(listPriceForPlan(proPlan, 'annual')).toMatch(/year/);
  });
});

describe('PlanCard', () => {
  it('renders plan title and primary CTA', () => {
    const onClick = vi.fn();
    render(
      <PlanCard
        plan={proPlan}
        priceHeadline='US$19'
        priceSubline='per month'
        primary={{
          label: 'Go Pro',
          onClick,
          disabled: false,
          loading: false,
        }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Pro' })).toBeInTheDocument();
  });

  it('disables CTA when hard blockers only', () => {
    render(
      <PlanCard
        plan={proPlan}
        priceHeadline='US$19'
        priceSubline='per month'
        blockers={{
          hard: ['Too many items'],
          soft: [],
        }}
        primary={{
          label: 'Downgrade to Pro',
          onClick: vi.fn(),
          disabled: false,
          loading: false,
        }}
      />
    );
    expect(screen.getByText('Too many items')).toBeInTheDocument();
    const btn = screen.getByRole('button', {
      name: 'Resolve issues to downgrade',
    });
    expect(btn).toBeDisabled();
  });

  it('keeps CTA enabled when only soft blockers', () => {
    render(
      <PlanCard
        plan={proPlan}
        priceHeadline='US$19'
        priceSubline='per month'
        blockers={{
          hard: [],
          soft: ['You will lose a feature'],
        }}
        primary={{
          label: 'Downgrade to Pro',
          onClick: vi.fn(),
          disabled: false,
          loading: false,
        }}
      />
    );
    expect(screen.getByText('You will lose a feature')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Downgrade to Pro' })
    ).not.toBeDisabled();
  });

  it('renders supplemental badge and savings callout when provided', () => {
    render(
      <PlanCard
        plan={proPlan}
        priceHeadline='US$19'
        priceSubline='per month'
        supplementalBadge='Scheduled'
        savingsCallout='2 Months Free'
        primary={{
          label: 'Go Pro',
          onClick: vi.fn(),
          disabled: false,
          loading: false,
        }}
      />
    );
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('2 Months Free')).toBeInTheDocument();
  });

  it('shows trial line when plan has trial_period_days', () => {
    const maxLike: Plan = {
      ...proPlan,
      id: 'beakerstack_max',
      display_name: 'Max',
      price_cents: 4900,
      trial_period_days: 5,
      usage_limits: { ai_summarize: -1 },
    };
    render(
      <PlanCard
        plan={maxLike}
        priceHeadline='US$49'
        priceSubline='per month'
        billingCadence='monthly'
        primary={{
          label: 'Start trial',
          onClick: vi.fn(),
          disabled: false,
          loading: false,
        }}
      />
    );
    expect(
      screen.getByText(/5-day trial, then billed monthly/i)
    ).toBeInTheDocument();
  });
});
