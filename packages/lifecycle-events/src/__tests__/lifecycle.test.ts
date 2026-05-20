import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  onLifecycleEvent,
  emitLifecycleEvent,
  resetListenersForTesting,
} from '../lifecycle.js';

beforeEach(() => resetListenersForTesting());
afterEach(() => resetListenersForTesting());

describe('onLifecycleEvent / emitLifecycleEvent', () => {
  it('calls registered listener', async () => {
    const fn = vi.fn();
    onLifecycleEvent(fn);
    await emitLifecycleEvent('user.signed_up', {
      email: 'a@b.com',
      userId: 'u1',
    });
    expect(fn).toHaveBeenCalledWith('user.signed_up', {
      email: 'a@b.com',
      userId: 'u1',
    });
  });

  it('unregisters listener on cleanup', async () => {
    const fn = vi.fn();
    const off = onLifecycleEvent(fn);
    off();
    await emitLifecycleEvent('user.signed_up', { email: 'a@b.com' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls multiple listeners', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    onLifecycleEvent(fn1);
    onLifecycleEvent(fn2);
    await emitLifecycleEvent('user.tier_changed', {
      email: 'a@b.com',
      previousTier: 'free',
      newTier: 'pro',
    });
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('continues emitting when one listener throws', async () => {
    const bad = vi.fn().mockRejectedValue(new Error('boom'));
    const good = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    onLifecycleEvent(bad);
    onLifecycleEvent(good);
    await expect(
      emitLifecycleEvent('user.churned', { email: 'a@b.com' })
    ).resolves.toBeUndefined();
    expect(good).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[lifecycle-events] listener failed:',
      'user.churned',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('handles all taxonomy event names without type errors', async () => {
    const events: string[] = [];
    onLifecycleEvent(e => {
      events.push(e);
    });
    const payload = { email: 'a@b.com' };
    await emitLifecycleEvent('waitlist.joined', payload);
    await emitLifecycleEvent('waitlist.approved', payload);
    await emitLifecycleEvent('waitlist.rejected', payload);
    await emitLifecycleEvent('waitlist.converted', payload);
    await emitLifecycleEvent('user.signed_up', payload);
    await emitLifecycleEvent('user.tier_changed', payload);
    await emitLifecycleEvent('user.churned', payload);
    expect(events).toHaveLength(7);
  });
});
