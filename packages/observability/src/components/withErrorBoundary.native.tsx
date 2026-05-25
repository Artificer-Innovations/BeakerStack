import React from 'react';
import { Text, View } from 'react-native';

const _sentryLoad = import('@sentry/react-native').catch(() => null);

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
          <View
            accessibilityRole='alert'
            style={{
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text>Something went wrong.</Text>
          </View>
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
