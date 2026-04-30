import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PricingTable } from './PricingTable.web.js';
import { usePlanCatalog } from '../hooks/usePlanCatalog.js';
import { usePlan } from '../hooks/usePlan.js';
import { testPlan } from '../test/billingFixtures.js';

vi.mock('../hooks/usePlanCatalog.js', () => ({ usePlanCatalog: vi.fn() }));
vi.mock('../hooks/usePlan.js', () => ({ usePlan: vi.fn() }));

describe('PricingTable (web)', () => {
  const p1 = testPlan({ id: 'p1', display_name: 'Pro', price_cents: 999 });
  const p2 = testPlan({ id: 'p2', display_name: 'Team', price_cents: 1999 });

  beforeEach(() => {
    vi.mocked(usePlanCatalog).mockReturnValue({
      plans: [p1, p2],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(usePlan).mockReturnValue({
      data: p1,
      loading: false,
      error: null,
    });
  });

  it('lists plans when loaded', () => {
    render(<PricingTable />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
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

  it('calls onSelectPlan', () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable onSelectPlan={onSelectPlan} />);
    const [, secondSelect] = screen.getAllByRole('button', { name: 'Select' });
    expect(secondSelect).toBeDefined();
    fireEvent.click(secondSelect);
    expect(onSelectPlan).toHaveBeenCalledWith('p2');
  });
});
