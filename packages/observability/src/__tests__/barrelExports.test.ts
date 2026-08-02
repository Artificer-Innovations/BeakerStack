import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  getClient: vi.fn(() => null),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((fn: (s: unknown) => unknown) => fn({})),
  startSpan: vi.fn((_opts: unknown, fn: () => unknown) => fn()),
  reactNavigationIntegration: vi.fn(() => ({
    registerNavigationContainer: vi.fn(),
  })),
  reactNativeTracingIntegration: vi.fn(() => ({})),
}));

vi.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
}));

describe('root barrel exports', () => {
  it('exports PII helpers', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.hashUserId).toBe('function');
    expect(typeof mod.scrubEmail).toBe('function');
    expect(typeof mod.scrubRequest).toBe('function');
  });
});

describe('web barrel exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../web.js');
    expect(typeof mod.ObservabilityProvider).toBe('function');
    expect(typeof mod.withErrorBoundary).toBe('function');
    expect(typeof mod.ErrorBoundary).toBe('function');
    expect(typeof mod.Profiler).toBe('function');
    expect(typeof mod.useObservability).toBe('function');
    expect(typeof mod.initObservability).toBe('function');
  });
});

describe('native barrel exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../native.js');
    expect(typeof mod.ObservabilityProvider).toBe('function');
    expect(typeof mod.useObservability).toBe('function');
    expect(typeof mod.initObservability).toBe('function');
  });
});

describe('edge barrel exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../edge.js');
    expect(typeof mod.withEdgeScope).toBe('function');
    expect(typeof mod.initEdgeObservability).toBe('function');
  });
});
