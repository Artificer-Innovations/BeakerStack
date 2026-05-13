import React from 'react';
import { reporter } from './reporter';
import { FallbackUI } from './FallbackUI';

interface Props {
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
  level?: 'screen' | 'root';
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reporter.captureException(error, { componentStack: info.componentStack });
    this.props.onError?.(error, info);
  }

  reset(): void {
    this.setState({ hasError: false, error: null });
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      const { fallback, level } = this.props;
      if (fallback !== undefined) {
        if (typeof fallback === 'function') {
          return fallback(this.state.error!, this.reset);
        }
        return fallback;
      }
      return (
        <FallbackUI
          level={level ?? 'screen'}
          error={this.state.error!}
          reset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
