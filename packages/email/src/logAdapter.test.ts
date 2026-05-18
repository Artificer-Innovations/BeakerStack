import { describe, expect, it, vi } from 'vitest';
import { createLogEmailAdapter } from './logAdapter.js';

describe('createLogEmailAdapter', () => {
  it('logs message without throwing', async () => {
    const log = vi.fn();
    const adapter = createLogEmailAdapter(log);
    await adapter.send({
      to: 'a@example.com',
      subject: 'Invite',
      html: '<p>Hi</p>',
    });
    expect(log).toHaveBeenCalledOnce();
  });
});
