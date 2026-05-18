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
      text: 'Hi plain',
    });
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toContain('Hi plain');
  });

  it('uses console.log when no logger is passed', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = createLogEmailAdapter();
    await adapter.send({
      to: 'a@example.com',
      subject: 'Invite',
      html: '<p>Hi</p>',
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
