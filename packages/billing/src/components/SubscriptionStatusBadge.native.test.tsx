import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge.native.js';
import { testSubscription } from '../test/billingFixtures.js';

describe('SubscriptionStatusBadge (native)', () => {
  it('returns null without subscription', () => {
    const { container } = render(
      <SubscriptionStatusBadge subscription={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('exposes accessibility label for Trial', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'trialing' })}
      />
    );
    expect(screen.getByLabelText('Trial')).toBeInTheDocument();
  });

  it('labels Free status', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'free' })}
      />
    );
    expect(screen.getByLabelText('Free')).toBeInTheDocument();
  });

  it('labels payment failed for past_due', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'past_due' })}
      />
    );
    expect(screen.getByLabelText('Payment failed')).toBeInTheDocument();
  });

  it('shows cancelling when cancel_at_period_end', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({
          cancel_at_period_end: true,
          current_period_end: '2026-12-31T00:00:00.000Z',
        })}
      />
    );
    expect(screen.getByLabelText(/Cancelling/)).toBeInTheDocument();
  });

  it('shows Active for active status', () => {
    render(<SubscriptionStatusBadge subscription={testSubscription()} />);
    expect(screen.getByLabelText('Active')).toBeInTheDocument();
  });

  it('shows Active for paused and unpaid statuses', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'paused' })}
      />
    );
    expect(screen.getByLabelText('Active')).toBeInTheDocument();

    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'unpaid' })}
      />
    );
    expect(screen.getAllByLabelText('Active').length).toBeGreaterThan(0);
  });

  it('keeps raw status label for unrecognized statuses', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({ status: 'canceled' })}
      />
    );
    expect(screen.getByLabelText('canceled')).toBeInTheDocument();
  });

  it('shows em dash in cancelling label when period end is missing', () => {
    render(
      <SubscriptionStatusBadge
        subscription={testSubscription({
          cancel_at_period_end: true,
          current_period_end: null,
        })}
      />
    );
    expect(screen.getByLabelText(/Cancelling.*—/)).toBeInTheDocument();
  });
});
