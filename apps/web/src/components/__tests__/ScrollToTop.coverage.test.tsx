import { describe, it, expect, vi, afterEach } from 'vitest';
import { scrollToHashElement, startHashScroll } from '../ScrollToTop';

describe('scrollToHashElement (coverage)', () => {
  it('returns false when element is not in the DOM for a valid id', () => {
    expect(scrollToHashElement('#not-in-dom-xyz')).toBe(false);
  });

  it('returns true and scrolls when element is found', () => {
    const el = document.createElement('section');
    el.id = 'coverage-anchor';
    el.scrollIntoView = vi.fn();
    document.body.append(el);
    expect(scrollToHashElement('#coverage-anchor')).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
    el.remove();
  });
});

describe('startHashScroll — 60-frame limit (coverage)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stops after HASH_SCROLL_MAX_FRAMES (60) without finding the element', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    startHashScroll('#never-mounts-xyz');

    // Drive all frames; stop when no more are queued (the 60-frame limit was hit)
    for (let i = 0; i < 65; i++) {
      const cb = rafQueue.shift();
      if (!cb) break;
      cb(i * 16);
    }

    // After hitting the limit, no further RAF callbacks are scheduled
    expect(rafQueue).toHaveLength(0);
  });
});
