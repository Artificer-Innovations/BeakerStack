import { describe, it, expect } from 'vitest';

describe('web barrel exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../web.js');
    expect(typeof mod.ObservabilityProvider).toBe('function');
    expect(typeof mod.withErrorBoundary).toBe('function');
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
