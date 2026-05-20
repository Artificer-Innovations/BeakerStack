import { Logger } from '@beakerstack/logger';
import React, { type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

export class BillingErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    Logger.error('BillingErrorBoundary', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
