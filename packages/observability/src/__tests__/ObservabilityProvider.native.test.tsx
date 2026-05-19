import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ObservabilityProvider } from '../components/ObservabilityProvider.native.js';
import { useObservability } from '../context.js';

// Must mock @sentry/react-native at module level before any imports
vi.mock('@sentry/react-native', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((fn: (s: unknown) => unknown) => fn({})),
  startSpan: vi.fn((_opts: unknown, fn: () => unknown) => fn()),
  getClient: vi.fn().mockReturnValue(null),
}));

const config = { project: 'test', environment: 'test' };

function Consumer({ action }: { action?: string }) {
  const obs = useObservability();
  React.useEffect(() => {
    if (action === 'setUser') obs.setUser('user-abc');
  }, [action, obs]);
  return <div>native-ok</div>;
}

describe('ObservabilityProvider (native)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <ObservabilityProvider config={config}>
        <div>child</div>
      </ObservabilityProvider>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('hashes user id before setUser', async () => {
    const Sentry = await import('@sentry/react-native');
    render(
      <ObservabilityProvider config={config}>
        <Consumer action="setUser" />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/^u_[0-9a-f]{16}$/) })
    );
  });
});
