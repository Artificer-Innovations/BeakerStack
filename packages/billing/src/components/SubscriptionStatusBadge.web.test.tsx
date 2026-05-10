import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge.web.js';
import { testSubscription } from '../test/billingFixtures.js';

describe('SubscriptionStatusBadge (web)', () => {
  it('returns null without subscription', () => {
    const { container } = render(
      <SubscriptionStatusBadge subscription={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Free for free status', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'free' })}
      />
    );
    expect(screen.getByTestId('subscription-status-badge')).toHaveTextContent(
      'Free'
    );
  });

  it('renders payment failed for past_due', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'past_due' })}
      />
    );
    expect(screen.getByText('Payment failed')).toBeInTheDocument();
  });

  it('renders Trial for trialing', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'trialing' })}
      />
    );
    expect(screen.getByText('Trial')).toBeInTheDocument();
  });

  it('renders Cancelling when cancel_at_period_end', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({
          cancel_at_period_end: true,
          current_period_end: '2026-07-01T00:00:00.000Z',
        })}
      />
    );
    expect(screen.getByText(/Cancelling/)).toBeInTheDocument();
  });

  it('renders Active for paused status', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'paused' })}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('uses default styling for unknown status', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'incomplete' })}
      />
    );
    expect(screen.getByTestId('subscription-status-badge')).toHaveTextContent(
      'incomplete'
    );
  });
});
