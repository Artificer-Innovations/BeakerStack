import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';

function NavButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>go</button>;
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
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
});
