import { describe, expect, it, vi } from 'vitest';
import { emitLifecycleEvent, onLifecycleEvent } from './lifecycle.js';

describe('lifecycle', () => {
  it('notifies listeners and supports unsubscribe', async () => {
    const fn = vi.fn();
    const off = onLifecycleEvent(fn);
    await emitLifecycleEvent('waitlist.joined', { email: 'a@b.com' });
    expect(fn).toHaveBeenCalledWith('waitlist.joined', { email: 'a@b.com' });
    off();
    await emitLifecycleEvent('waitlist.approved', {
      email: 'a@b.com',
      entryId: 'e1',
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not reject when a listener throws', async () => {
    const off = onLifecycleEvent(() => {
      throw new Error('listener boom');
    });
    await expect(
      emitLifecycleEvent('waitlist.joined', { email: 'x@y.com' })
    ).resolves.toBeUndefined();
    off();
  });
});
