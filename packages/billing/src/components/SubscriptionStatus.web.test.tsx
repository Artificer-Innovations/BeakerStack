import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubscriptionStatus } from './SubscriptionStatus.web.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { usePlan } from '../hooks/usePlan.js';
import { testPlan, testSubscription } from '../test/billingFixtures.js';

vi.mock('../hooks/useSubscription.js', () => ({ useSubscription: vi.fn() }));
vi.mock('../hooks/usePlan.js', () => ({ usePlan: vi.fn() }));

describe('SubscriptionStatus (web)', () => {
  beforeEach(() => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription(),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(usePlan).mockReturnValue({
      data: testPlan({ display_name: 'Free' }),
      loading: false,
      error: null,
    });
  });

  it('shows loading placeholder', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders plan and status', () => {
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Plan:/)).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
  });

  it('shows past_due warning', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription({ status: 'past_due' }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(
      screen.getByText('Payment issue — update billing in the portal.')
    ).toBeInTheDocument();
  });
});
