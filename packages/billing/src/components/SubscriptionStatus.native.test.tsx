import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubscriptionStatus } from './SubscriptionStatus.native.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { usePlan } from '../hooks/usePlan.js';
import { testPlan, testSubscription } from '../test/billingFixtures.js';

vi.mock('../hooks/useSubscription.js', () => ({ useSubscription: vi.fn() }));
vi.mock('../hooks/usePlan.js', () => ({ usePlan: vi.fn() }));

describe('SubscriptionStatus (native)', () => {
  beforeEach(() => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription(),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(usePlan).mockReturnValue({
      data: testPlan(),
      loading: false,
      error: null,
    });
  });

  it('renders status line', () => {
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
  });

  it('renders loading placeholder', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('formats renewal date when period end is set', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription({
        current_period_end: '2026-06-15T00:00:00.000Z',
      }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Renews \/ period ends:/)).toBeInTheDocument();
    expect(screen.queryByText(/Renews \/ period ends: —/)).toBeNull();
  });

  it('falls back to em dash when plan and subscription are missing', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(usePlan).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Plan: —/)).toBeInTheDocument();
  });

  it('shows past_due billing warning', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription({ status: 'past_due' }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Payment issue/)).toBeInTheDocument();
  });

  it('shows em dash when period end is missing', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: testSubscription({ current_period_end: null }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText(/Renews \/ period ends: —/)).toBeInTheDocument();
  });

  it('falls back to plan_id when plan row missing', () => {
    vi.mocked(usePlan).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
    render(<SubscriptionStatus />);
    expect(screen.getByText(/plan_free/)).toBeInTheDocument();
  });
});
