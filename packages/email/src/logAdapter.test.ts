import { describe, expect, it, vi } from 'vitest';

vi.mock('@beakerstack/logger', () => ({
  Logger: {
    info: vi.fn(),
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
    expect(log.mock.calls[0]?.[0]).toContain('Hi plain');
  });

  it('uses Logger.info when no logger is passed', async () => {
    const adapter = createLogEmailAdapter();
    await adapter.send({
      to: 'a@example.com',
      subject: 'Invite',
      html: '<p>Hi</p>',
    });
    expect(Logger.info).toHaveBeenCalled();
  });
});
