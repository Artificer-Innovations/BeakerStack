import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ObservabilityProvider } from '../components/ObservabilityProvider.web.js';
import { useObservability } from '../context.js';
import * as SentryMock from '@sentry/react';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((fn: (s: unknown) => unknown) => fn({})),
  startSpan: vi.fn((_opts: unknown, fn: () => unknown) => fn()),
}));

const config = { project: 'test', environment: 'test' };

function Consumer({ action }: { action?: string }) {
  const obs = useObservability();
  React.useEffect(() => {
    if (action === 'setUser') obs.setUser('user-123');
    if (action === 'clearUser') obs.setUser(null);
    if (action === 'breadcrumb') obs.addBreadcrumb({ message: 'hello user@example.com' });
  }, [action, obs]);
  return <div>ok</div>;
}

describe('ObservabilityProvider (web)', () => {
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
    render(
      <ObservabilityProvider config={config}>
        <Consumer action="setUser" />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/^hashed_/) })
    );
  });

  it('passes null to setUser on clearUser', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action="clearUser" />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.setUser).toHaveBeenCalledWith(null);
  });

  it('scrubs email from breadcrumb message', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action="breadcrumb" />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'hello [email]' })
    );
  });
});
