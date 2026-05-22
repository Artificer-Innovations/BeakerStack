import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initEdgeObservability,
  withEdgeScope,
  resetForTesting,
} from '../init.edge.js';

describe('initEdgeObservability', () => {
  beforeEach(() => resetForTesting());

  it('validates and initializes on first call', () => {
    expect(() =>
      initEdgeObservability({ project: 'p', environment: 'test' })
    ).not.toThrow();
  });

  it('is idempotent — second call returns early without re-running', () => {
    const config = { project: 'p', environment: 'test' };
    initEdgeObservability(config);
    // _initialized is now true; second call hits the guard and returns
    expect(() => initEdgeObservability(config)).not.toThrow();
  });
});

describe('withEdgeScope', () => {
  beforeEach(() => resetForTesting());

  it('calls the handler and returns its response', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'));
    const wrapped = withEdgeScope(handler);
    const req = new Request('https://example.com');
    const res = await wrapped(req);
    expect(handler).toHaveBeenCalledWith(req);
    expect(await res.text()).toBe('ok');
  });

  it('calls handler on each invocation', async () => {
    let callCount = 0;
    const handler = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(`call-${callCount}`);
    });
    const wrapped = withEdgeScope(handler);
    const req = new Request('https://example.com');
    await wrapped(req);
    await wrapped(req);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
