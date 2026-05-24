import React from 'react';
import { render } from '@testing-library/react-native';
import { usePlan } from '@beakerstack/billing';
import { FeatureGateCard } from '../FeatureGateCard';

const gateState = { showChildren: true };

jest.mock('@beakerstack/billing', () => ({
  defineBillingConfig: (c: unknown) => c,
  usePlan: jest.fn(),
}));

jest.mock('@beakerstack/billing/native', () => {
  const React = require('react');
  return {
    FeatureGate: ({
      children,
      fallback,
    }: {
      children: React.ReactNode;
      fallback: React.ReactNode;
    }) => (gateState.showChildren ? <>{children}</> : <>{fallback}</>),
  };
});

jest.mock('../LucideLockIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    LucideLockIcon: () => React.createElement(Text, null, 'lock'),
  };
});

const mockUsePlan = jest.mocked(usePlan);

describe('FeatureGateCard', () => {
  beforeEach(() => {
    gateState.showChildren = true;
    mockUsePlan.mockReturnValue({
      data: { id: 'beakerstack_pro' },
      loading: false,
    } as ReturnType<typeof usePlan>);
  });

  it('shows loading copy while plan is loading', () => {
    mockUsePlan.mockReturnValue({
      data: null,
      loading: true,
    } as ReturnType<typeof usePlan>);

    const { getByText, queryByText } = render(<FeatureGateCard />);
    expect(getByText('…')).toBeTruthy();
    expect(queryByText('Feature A is active')).toBeNull();
    expect(queryByText(/locked on your current plan/i)).toBeNull();
  });

  it('renders active children when the feature gate allows access', () => {
    gateState.showChildren = true;
    const { getByText } = render(<FeatureGateCard />);
    expect(getByText('Feature A is active')).toBeTruthy();
  });

  it('renders locked fallback when the feature gate denies access', () => {
    gateState.showChildren = false;
    const { getByText } = render(<FeatureGateCard />);
    expect(getByText(/Feature A is locked on your current plan/i)).toBeTruthy();
  });
});
