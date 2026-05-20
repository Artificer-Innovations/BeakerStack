import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  ErrorBoundary,
  withErrorBoundary,
} from '../components/withErrorBoundary.web.js';
import * as SentryMock from '@sentry/react';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

function Thrower() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('renders default fallback on uncaught error', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('renders custom fallback on error', () => {
    render(
      <ErrorBoundary fallback={<div>custom error</div>}>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom error')).toBeInTheDocument();
  });

  it('calls Sentry.captureException on error', async () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    await waitFor(() => {
      expect(SentryMock.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({ componentStack: expect.anything() }),
        })
      );
    });
  });
});

describe('withErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('renders the wrapped component normally', () => {
    const Wrapped = withErrorBoundary(() => <div>wrapped ok</div>);
    render(<Wrapped />);
    expect(screen.getByText('wrapped ok')).toBeInTheDocument();
  });

  it('shows fallback when wrapped component throws', () => {
    const Wrapped = withErrorBoundary(Thrower, <div>hoc fallback</div>);
    render(<Wrapped />);
    expect(screen.getByText('hoc fallback')).toBeInTheDocument();
  });
});
