import { describe, it, expect, vi, afterEach } from 'vitest';

describe('Sentry dynamic import fallbacks', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@sentry/react');
    vi.doUnmock('@sentry/react-native');
  });

  it('ObservabilityProvider survives a rejected @sentry/react import', async () => {
    vi.doMock('@sentry/react', () => Promise.reject(new Error('chunk failed')));
    const { ObservabilityProvider } =
      await import('../components/ObservabilityProvider.web.js');
    const React = await import('react');
    const { render, screen } = await import('@testing-library/react');

    render(
      React.createElement(
        ObservabilityProvider,
        { config: { project: 'test', environment: 'test' } },
        React.createElement('div', null, 'child')
      )
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('withErrorBoundary.web survives a rejected @sentry/react import', async () => {
    vi.doMock('@sentry/react', () => Promise.reject(new Error('chunk failed')));
    const { ErrorBoundary } =
      await import('../components/withErrorBoundary.web.js');
    const React = await import('react');
    const { render, screen } = await import('@testing-library/react');

    function Thrower() {
      throw new Error('boom');
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        React.createElement(ErrorBoundary, null, React.createElement(Thrower))
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('withErrorBoundary.native still renders fallback when Sentry is a stub', async () => {
    vi.doMock('@sentry/react-native', () => ({
      captureException: undefined,
    }));
    const { ErrorBoundary } =
      await import('../components/withErrorBoundary.native.js');
    const React = await import('react');
    const { render, screen } = await import('@testing-library/react');

    function Thrower() {
      throw new Error('boom');
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        React.createElement(ErrorBoundary, null, React.createElement(Thrower))
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
