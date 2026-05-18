import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(React.Fragment as any, null, children),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Screen: (_props: any) => null,
  }),
}));

jest.mock('../../screens/billing/BillingOverviewScreen', () => ({
  BillingOverviewScreen: () => null,
}));
jest.mock('../../screens/billing/BillingUsageScreen', () => ({
  BillingUsageScreen: () => null,
}));

describe('BillingNavigator', () => {
  it('renders without crashing', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: BillingNavigator } = require('../BillingNavigator') as
      typeof import('../BillingNavigator');
    expect(() => render(<BillingNavigator />)).not.toThrow();
  });
});
