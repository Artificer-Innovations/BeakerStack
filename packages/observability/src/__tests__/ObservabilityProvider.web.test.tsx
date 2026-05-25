import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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
    if (action === 'breadcrumb')
      obs.addBreadcrumb({ message: 'hello user@example.com' });
    if (action === 'captureException') obs.captureException(new Error('oops'));
    if (action === 'captureExceptionCtx')
      obs.captureException(new Error('oops'), { key: 'val' });
    if (action === 'captureMessage') obs.captureMessage('hello', 'warning');
    if (action === 'withScope') obs.withScope(scope => scope);
    if (action === 'startSpan') obs.startSpan('op', () => 'done');
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
        <Consumer action='setUser' />
      </ObservabilityProvider>
    );
    await waitFor(() => {
      expect(SentryMock.setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^u_[0-9a-f]{64}$/),
        })
      );
    });
  });

  it('passes null to setUser on clearUser', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='clearUser' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.setUser).toHaveBeenCalledWith(null);
  });

  it('scrubs email from breadcrumb message', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='breadcrumb' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'hello [email]' })
    );
  });

  it('captureException without context', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='captureException' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      undefined
    );
  });

  it('captureException with context', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='captureExceptionCtx' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      { extra: { key: 'val' } }
    );
  });

  it('captureMessage with level', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='captureMessage' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.captureMessage).toHaveBeenCalledWith('hello', 'warning');
  });

  it('withScope calls Sentry.withScope', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='withScope' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.withScope).toHaveBeenCalled();
  });

  it('startSpan calls Sentry.startSpan', async () => {
    render(
      <ObservabilityProvider config={config}>
        <Consumer action='startSpan' />
      </ObservabilityProvider>
    );
    await act(async () => {});
    expect(SentryMock.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'op' }),
      expect.any(Function)
    );
  });
});
