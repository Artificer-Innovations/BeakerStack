import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppErrorBoundary } from '../../src/components/AppErrorBoundary';

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@beakerstack/observability/native', () => {
  const React = require('react');
  class ErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    render() {
      if (this.state.hasError) {
        return this.props.fallback ?? null;
      }
      return this.props.children;
    }
  }

  return {
    ErrorBoundary,
    ObservabilityProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

const Updates = jest.requireMock('expo-updates') as {
  reloadAsync: jest.Mock;
};

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('test error');
  }
  return null;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    const { queryByText } = render(
      <AppErrorBoundary>
        <Bomb shouldThrow={false} />
      </AppErrorBoundary>
    );
    expect(queryByText('Something went wrong.')).toBeNull();
  });

  it('renders fallback when a child throws', () => {
    const { getByText } = render(
      <AppErrorBoundary>
        <Bomb shouldThrow={true} />
      </AppErrorBoundary>
    );
    expect(getByText('Something went wrong.')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('calls Updates.reloadAsync when Try again is pressed', () => {
    const { getByLabelText } = render(
      <AppErrorBoundary>
        <Bomb shouldThrow={true} />
      </AppErrorBoundary>
    );

    fireEvent.press(getByLabelText('Try again'));
    expect(Updates.reloadAsync).toHaveBeenCalled();
  });

  it('swallows reloadAsync rejection', async () => {
    Updates.reloadAsync.mockRejectedValueOnce(new Error('reload failed'));

    const { getByLabelText } = render(
      <AppErrorBoundary>
        <Bomb shouldThrow={true} />
      </AppErrorBoundary>
    );

    fireEvent.press(getByLabelText('Try again'));
    await Promise.resolve();
    expect(Updates.reloadAsync).toHaveBeenCalled();
  });
});
