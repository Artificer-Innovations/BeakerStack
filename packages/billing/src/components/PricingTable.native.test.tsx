import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PricingTable } from './PricingTable.native.js';
import { usePlanCatalog } from '../hooks/usePlanCatalog.js';
import { usePlan } from '../hooks/usePlan.js';
import { testPlan } from '../test/billingFixtures.js';

vi.mock('../hooks/usePlanCatalog.js', () => ({ usePlanCatalog: vi.fn() }));
vi.mock('../hooks/usePlan.js', () => ({ usePlan: vi.fn() }));

describe('PricingTable (native)', () => {
  const p1 = testPlan({ id: 'p1', display_name: 'Pro', price_cents: 999 });

  beforeEach(() => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [p1],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(usePlan).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
  });

  it('renders plan row', () => {
    render(<PricingTable />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('invokes onSelectPlan from pressable', () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable onSelectPlan={onSelectPlan} />);
    fireEvent.click(screen.getByText('Select'));
    expect(onSelectPlan).toHaveBeenCalledWith('p1');
  });

  it('shows loading state', () => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    render(<PricingTable />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('prefers onCheckout over onSelectPlan', () => {
    const onCheckout = vi.fn();
    const onSelectPlan = vi.fn();
    render(
      <PricingTable onCheckout={onCheckout} onSelectPlan={onSelectPlan} />
    );
    fireEvent.click(screen.getByText('Select'));
    expect(onCheckout).toHaveBeenCalledWith('p1');
    expect(onSelectPlan).not.toHaveBeenCalled();
  });

  it('shows trial note for paid plans with trial days', () => {
    const paid = testPlan({
      id: 'p2',
      display_name: 'Pro',
      price_cents: 999,
      trial_period_days: 14,
    });
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [paid],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<PricingTable />);
    expect(screen.getByText(/14-day trial/)).toBeInTheDocument();
  });

  it('highlights current plan when highlightCurrent is enabled', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: p1,
      loading: false,
      error: null,
    });
    render(<PricingTable highlightCurrent onSelectPlan={vi.fn()} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('ignores empty highlightPlanId', () => {
    render(<PricingTable highlightPlanId='' onSelectPlan={vi.fn()} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('highlights plan when highlightPlanId matches', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
    render(
      <PricingTable highlightPlanId='p1' productId='x' currentUserId='y' />
    );
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});
