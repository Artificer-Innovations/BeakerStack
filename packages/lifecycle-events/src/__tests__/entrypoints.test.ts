import { describe, expect, it, vi } from 'vitest';
import {
  emitLifecycleEvent,
  onLifecycleEvent,
  resetListenersForTesting,
} from '../index.js';

describe('package entrypoints', () => {
  it('re-exports lifecycle API from index', async () => {
    resetListenersForTesting();
    const fn = vi.fn();
    onLifecycleEvent(fn);
    await emitLifecycleEvent('waitlist.joined', { email: 'a@b.com' });
    expect(fn).toHaveBeenCalledWith('waitlist.joined', { email: 'a@b.com' });
    resetListenersForTesting();
  });
});
