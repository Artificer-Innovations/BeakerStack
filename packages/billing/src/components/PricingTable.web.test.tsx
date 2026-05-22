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

  it('prefers onCheckout over onSelectPlan', () => {
    const onSelectPlan = vi.fn();
    const onCheckout = vi.fn();
    render(
      <PricingTable onSelectPlan={onSelectPlan} onCheckout={onCheckout} />
    );
    const [firstSelect] = screen.getAllByRole('button', { name: 'Select' });
    expect(firstSelect).toBeDefined();
    fireEvent.click(firstSelect);
    expect(onCheckout).toHaveBeenCalledWith('p1');
    expect(onSelectPlan).not.toHaveBeenCalled();
  });

  it('highlights current plan when highlightCurrent is enabled', () => {
    const { container } = render(
      <PricingTable highlightCurrent onSelectPlan={vi.fn()} />
    );
    const items = container.querySelectorAll('li');
    expect(items[0]?.getAttribute('style')).toContain('2px solid');
    expect(items[1]?.getAttribute('style')).not.toContain('2px solid');
  });

  it('ignores empty highlightPlanId', () => {
    const { container } = render(
      <PricingTable highlightPlanId='' onSelectPlan={vi.fn()} />
    );
    const items = container.querySelectorAll('li');
    items.forEach(li => {
      expect(li.getAttribute('style')).not.toContain('2px solid');
    });
  });

  it('highlights plan by highlightPlanId', () => {
    const { container } = render(
      <PricingTable highlightPlanId='p2' onSelectPlan={vi.fn()} />
    );
    const items = container.querySelectorAll('li');
    expect(items[1]?.getAttribute('style')).toContain('2px solid');
  });

  it('omits action buttons when no handler is provided', () => {
    render(<PricingTable />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Get started when unauthenticated', () => {
    render(<PricingTable isAuthenticated={false} onSelectPlan={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Get started' }).length).toBe(
      2
    );
  });
});
