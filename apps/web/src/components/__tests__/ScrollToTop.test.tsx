import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import {
  ScrollToTop,
  scrollToHashElement,
  startHashScroll,
} from '../ScrollToTop';

function NavButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>go</button>;
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls to top on mount', () => {
    render(
      <MemoryRouter initialEntries={['/start']}>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to top when pathname changes', async () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <NavButton to='/b' />
      </MemoryRouter>
    );
    vi.mocked(window.scrollTo).mockClear();
    await act(async () => {
      getByRole('button', { name: 'go' }).click();
    });
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll on hash-only change within same pathname', async () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/page']}>
        <ScrollToTop />
        <NavButton to='/page#section' />
      </MemoryRouter>
    );
    vi.mocked(window.scrollTo).mockClear();
    await act(async () => {
      getByRole('button', { name: 'go' }).click();
    });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll to top when landing on a hash route', () => {
    const target = document.createElement('section');
    target.id = 'features';
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    render(
      <MemoryRouter initialEntries={['/#features']}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(target.scrollIntoView).toHaveBeenCalled();
    target.remove();
  });

  it('scrolls to hash target instead of top when pathname changes with hash', async () => {
    const target = document.createElement('section');
    target.id = 'pricing';
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    const { getByRole } = render(
      <MemoryRouter initialEntries={['/privacy']}>
        <ScrollToTop />
        <NavButton to='/#pricing' />
      </MemoryRouter>
    );
    vi.mocked(window.scrollTo).mockClear();
    vi.mocked(target.scrollIntoView).mockClear();

    await act(async () => {
      getByRole('button', { name: 'go' }).click();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(target.scrollIntoView).toHaveBeenCalled();
    target.remove();
  });

  it('cancels in-flight hash scroll when navigating to a different hash', async () => {
    const pricing = document.createElement('section');
    pricing.id = 'pricing';
    pricing.scrollIntoView = vi.fn();
    const faq = document.createElement('section');
    faq.id = 'faq';
    faq.scrollIntoView = vi.fn();
    document.body.append(pricing, faq);

    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const { getByRole } = render(
      <MemoryRouter initialEntries={['/#missing']}>
        <ScrollToTop />
        <NavButton to='/#faq' />
      </MemoryRouter>
    );

    await act(async () => {
      getByRole('button', { name: 'go' }).click();
    });
    expect(faq.scrollIntoView).toHaveBeenCalled();

    vi.mocked(faq.scrollIntoView).mockClear();
    while (rafQueue.length > 0) {
      rafQueue.shift()?.(0);
    }
    expect(faq.scrollIntoView).not.toHaveBeenCalled();

    pricing.remove();
    faq.remove();
  });
});

describe('scrollToHashElement', () => {
  it('returns false for malformed percent-encoding without throwing', () => {
    expect(scrollToHashElement('#%E0%A4%A')).toBe(false);
  });

  it('returns false when the hash is empty', () => {
    expect(scrollToHashElement('')).toBe(false);
  });

  it('returns false when the hash is just "#"', () => {
    expect(scrollToHashElement('#')).toBe(false);
  });

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

describe('startHashScroll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries until the target element exists', () => {
    const target = document.createElement('section');
    target.id = 'faq';
    target.scrollIntoView = vi.fn();

    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const cleanup = startHashScroll('#faq');
    expect(target.scrollIntoView).not.toHaveBeenCalled();

    const firstFrame = rafQueue.shift();
    expect(firstFrame).toBeTypeOf('function');
    firstFrame?.(0);
    expect(target.scrollIntoView).not.toHaveBeenCalled();

    document.body.append(target);
    const secondFrame = rafQueue.shift();
    secondFrame?.(0);
    expect(target.scrollIntoView).toHaveBeenCalled();

    cleanup();
    target.remove();
  });

  it('stops retrying after cleanup when the target mounts later', () => {
    const target = document.createElement('section');
    target.id = 'late';
    target.scrollIntoView = vi.fn();

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const cleanup = startHashScroll('#late');
    cleanup();

    document.body.append(target);
    for (const cb of rafCallbacks) {
      cb(0);
    }
    expect(target.scrollIntoView).not.toHaveBeenCalled();
    target.remove();
  });

  it('stops after HASH_SCROLL_MAX_FRAMES (60) without finding the element', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    startHashScroll('#never-mounts-xyz');

    for (let i = 0; i < 65; i++) {
      const cb = rafQueue.shift();
      if (!cb) break;
      cb(i * 16);
    }

    expect(rafQueue).toHaveLength(0);
  });
});
