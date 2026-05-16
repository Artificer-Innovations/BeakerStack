import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { Plan } from '../types.js';
import { CadenceToggle } from './CadenceToggle.native.js';

vi.mock('../presentation/billingSyncDisplay.js', () => ({
  cadenceAnnualSavingsFromPlans: vi.fn(() => ({ kind: 'months', months: 2 })),
  formatCadenceToggleSavingsBadge: vi.fn(() => '2 Months Free'),
}));

const paidPlan = (id: string): Plan => ({
  id,
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
});

describe('CadenceToggle (native)', () => {
  it('renders monthly and annual with savings badge', () => {
    const onCadenceChange = vi.fn();
    render(
      <CadenceToggle
        cadence='monthly'
        onCadenceChange={onCadenceChange}
        plans={[paidPlan('beakerstack_pro')]}
      />
    );
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Annually')).toBeTruthy();
    expect(screen.getByText('2 Months Free')).toBeTruthy();
  });

  it('calls onCadenceChange when annual is pressed', () => {
    const onCadenceChange = vi.fn();
    render(
      <CadenceToggle
        cadence='monthly'
        onCadenceChange={onCadenceChange}
        plans={[paidPlan('beakerstack_pro')]}
      />
    );
    fireEvent.click(screen.getByText('Annually'));
    expect(onCadenceChange).toHaveBeenCalledWith('annual');
  });
});
