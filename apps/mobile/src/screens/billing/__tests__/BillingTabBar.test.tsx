import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BillingTabBar } from '../BillingTabBar';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  useRoute: jest.fn(() => ({ name: 'BillingOverview' })),
}));

describe('BillingTabBar', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders Overview and Usage tab labels', () => {
    const { getByText } = render(<BillingTabBar />);
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Usage')).toBeTruthy();
  });

  it('marks Overview as selected and Usage as unselected when route is BillingOverview', () => {
    const { getAllByRole } = render(<BillingTabBar />);
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAccessibilityState({ selected: true });
    expect(tabs[1]).toHaveAccessibilityState({ selected: false });
  });

  it('calls navigate with BillingUsage when Usage tab is pressed', () => {
    const { getByLabelText } = render(<BillingTabBar />);
    fireEvent.press(getByLabelText('Usage'));
    expect(mockNavigate).toHaveBeenCalledWith('BillingUsage');
  });

  it('calls navigate with BillingOverview when Overview tab is pressed', () => {
    const { getByLabelText } = render(<BillingTabBar />);
    fireEvent.press(getByLabelText('Overview'));
    expect(mockNavigate).toHaveBeenCalledWith('BillingOverview');
  });
});
