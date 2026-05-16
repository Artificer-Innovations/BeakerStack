import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ScrollToTop, scrollToHash } from '../ScrollToTop';

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
});

describe('scrollToHash', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries until the target element exists', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });

    const target = document.createElement('section');
    target.id = 'faq';
    target.scrollIntoView = vi.fn();

    scrollToHash('#faq');
    expect(target.scrollIntoView).not.toHaveBeenCalled();

    document.body.append(target);
    scrollToHash('#faq');
    expect(target.scrollIntoView).toHaveBeenCalled();

    target.remove();
  });
});
