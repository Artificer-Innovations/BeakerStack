/* eslint-disable @typescript-eslint/no-explicit-any */

export type ReactNavigationIntegration = {
  registerNavigationContainer: (navigationContainerRef: unknown) => void;
};

let navigationIntegration: ReactNavigationIntegration | null = null;

export function getOrCreateReactNavigationIntegration(
  Sentry: any
): ReactNavigationIntegration {
  if (navigationIntegration !== null) {
    return navigationIntegration;
  }

  const created =
    Sentry.reactNavigationIntegration() as ReactNavigationIntegration;
  navigationIntegration = created;
  return created;
}

export function getReactNavigationIntegration(): ReactNavigationIntegration | null {
  return navigationIntegration;
}

export function resetNavigationIntegrationForTesting(): void {
  navigationIntegration = null;
}
