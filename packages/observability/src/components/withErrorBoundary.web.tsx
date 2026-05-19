import React from 'react';

// Module-level Sentry reference — dynamic import is intercepted by vi.mock in tests.
const Sentry = await import('@sentry/react').catch(() => null) as typeof import('@sentry/react') | null;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry?.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>
          <p>Something went wrong.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  return function WrappedWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
