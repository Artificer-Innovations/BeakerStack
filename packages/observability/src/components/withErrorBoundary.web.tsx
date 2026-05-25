import React from 'react';

// Module-scope load (no top-level await) — Vite can statically analyze this for chunk hashing.
const _sentryLoad = import('@sentry/react').catch(() => null);

interface ErrorBoundaryState {
  hasError: boolean;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    void _sentryLoad.then(Sentry => {
      Sentry?.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role='alert' style={{ padding: '1rem', textAlign: 'center' }}>
            <p>Something went wrong.</p>
          </div>
        )
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
