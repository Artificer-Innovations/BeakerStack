import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrCreateReactNavigationIntegration,
  getReactNavigationIntegration,
  resetNavigationIntegrationForTesting,
} from '../reactNavigationIntegration.native.js';

describe('reactNavigationIntegration.native', () => {
  beforeEach(() => {
    resetNavigationIntegrationForTesting();
  });

  it('returns null before integration is created', () => {
    expect(getReactNavigationIntegration()).toBeNull();
  });

  it('creates integration once and reuses it', () => {
    const integration = { registerNavigationContainer: vi.fn() };
    const Sentry = {
      reactNavigationIntegration: vi.fn(() => integration),
    };

    const first = getOrCreateReactNavigationIntegration(Sentry);
    const second = getOrCreateReactNavigationIntegration(Sentry);

    expect(Sentry.reactNavigationIntegration).toHaveBeenCalledTimes(1);
    expect(first).toBe(integration);
    expect(second).toBe(integration);
    expect(getReactNavigationIntegration()).toBe(integration);
  });

  it('resets integration for testing', () => {
    const Sentry = {
      reactNavigationIntegration: vi.fn(() => ({
        registerNavigationContainer: vi.fn(),
      })),
    };

    getOrCreateReactNavigationIntegration(Sentry);
    resetNavigationIntegrationForTesting();

    expect(getReactNavigationIntegration()).toBeNull();
  });
});
