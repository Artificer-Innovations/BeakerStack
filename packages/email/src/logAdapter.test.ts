import { describe, expect, it, vi } from 'vitest';

vi.mock('@beakerstack/logger', () => ({
  Logger: {
    debug: vi.fn(),
  },
}));

import { Logger } from '@beakerstack/logger';
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
    expect(log.mock.calls[0]?.[0]).toContain('subject=Invite');
    expect(log.mock.calls[0]?.[0]).not.toContain('Hi plain');
  });

  it('uses Logger.debug when no logger is passed', async () => {
    const adapter = createLogEmailAdapter();
    await adapter.send({
      to: 'a@example.com',
      subject: 'Invite',
      html: '<p>Hi</p>',
    });
    expect(Logger.debug).toHaveBeenCalled();
    expect(vi.mocked(Logger.debug).mock.calls[0]?.[0]).not.toContain('<p>');
  });
});
