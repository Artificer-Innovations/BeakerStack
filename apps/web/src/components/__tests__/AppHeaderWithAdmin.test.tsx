import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useIsAdmin } from '@beakerstack/admin';
import { AppHeaderWithAdmin } from '../AppHeaderWithAdmin';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return { ...actual, useIsAdmin: vi.fn() };
});

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@beakerstack/shared/components/navigation/AppHeader.web', () => ({
  AppHeader: ({ showAdminLink }: { showAdminLink?: boolean }) => (
    <div
      data-testid='app-header'
      data-show-admin-link={String(showAdminLink ?? false)}
    />
  ),
}));

const mockUser = { id: 'user-123', email: 'user@example.com' };
const mockRefresh = vi.fn();

describe('AppHeaderWithAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as never);
    vi.mocked(useIsAdmin).mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('passes showAdminLink=true when user is admin and not loading', () => {
    vi.mocked(useIsAdmin).mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    expect(screen.getByTestId('app-header')).toHaveAttribute(
      'data-show-admin-link',
      'true'
    );
  });

  it('passes showAdminLink=false when user is not admin', () => {
    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    expect(screen.getByTestId('app-header')).toHaveAttribute(
      'data-show-admin-link',
      'false'
    );
  });

  it('passes showAdminLink=false while admin check is loading (fail-closed)', () => {
    vi.mocked(useIsAdmin).mockReturnValue({
      isAdmin: false,
      loading: true,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    expect(screen.getByTestId('app-header')).toHaveAttribute(
      'data-show-admin-link',
      'false'
    );
  });

  it('passes showAdminLink=false when admin check errors (fail-closed)', () => {
    vi.mocked(useIsAdmin).mockReturnValue({
      isAdmin: false,
      loading: false,
      error: new Error('RPC error'),
      refresh: mockRefresh,
    });

    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    expect(screen.getByTestId('app-header')).toHaveAttribute(
      'data-show-admin-link',
      'false'
    );
  });

  it('calls refresh on window focus when user is logged in', async () => {
    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('calls refresh on visibilitychange when document is visible', async () => {
    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('does not call refresh on focus when no user is logged in', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: null } as never);

    render(
      <MemoryRouter>
        <AppHeaderWithAdmin />
      </MemoryRouter>
    );

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
