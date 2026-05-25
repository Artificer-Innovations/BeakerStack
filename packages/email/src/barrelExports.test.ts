import { describe, expect, it } from 'vitest';

describe('package barrels', () => {
  it('exports main entry', async () => {
    const mod = await import('./index.js');
    expect(mod.createLogEmailAdapter).toBeTypeOf('function');
    expect(mod.renderEmailTemplate).toBeTypeOf('function');
    expect(mod.createResendEmailAdapter).toBeTypeOf('function');
    expect(mod.EmailSendError).toBeTypeOf('function');
  });
});
