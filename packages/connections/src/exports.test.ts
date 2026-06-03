import { describe, expect, it } from 'vitest';

describe('package exports', () => {
  it('re-exports core API from index', async () => {
    const index = await import('./index.js');
    expect(index.useConnections).toBeTypeOf('function');
    expect(index.connectionsRequest).toBeTypeOf('function');
    expect(index.connectionListRowSchema).toBeDefined();
  });

  it('re-exports web components', async () => {
    const web = await import('./web.js');
    expect(web.ConnectionUserRow).toBeTypeOf('function');
    expect(web.ConnectionSearchPanel).toBeTypeOf('function');
  });

  it('re-exports native entry', async () => {
    const native = await import('./native.js');
    expect(native.useConnections).toBeTypeOf('function');
  });

  it('re-exports client entry', async () => {
    const client = await import('./client.js');
    expect(client.ConnectionSearchPanel).toBeTypeOf('function');
  });
});
