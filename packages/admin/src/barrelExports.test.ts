import { describe, expect, it } from 'vitest';

describe('package barrels', () => {
  it('exports main entry', async () => {
    const mod = await import('./index.js');
    expect(mod.checkIsAdmin).toBeTypeOf('function');
    expect(mod.useIsAdmin).toBeTypeOf('function');
    expect(mod.listUsers).toBeTypeOf('function');
    expect(mod.recordAuditEvent).toBeTypeOf('function');
  });

  it('exports web entry', async () => {
    const mod = await import('./web.js');
    expect(mod.AdminRoute).toBeTypeOf('function');
    expect(mod.AdminLayout).toBeTypeOf('function');
    expect(mod.AdminTable).toBeTypeOf('function');
  });

  it('exports audit re-exports', async () => {
    const mod = await import('./audit.js');
    expect(mod.recordAuditEvent).toBeTypeOf('function');
  });
});
