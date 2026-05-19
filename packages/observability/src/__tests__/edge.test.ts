import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withEdgeScope, resetForTesting } from '../init.edge.js';

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
