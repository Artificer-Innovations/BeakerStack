import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AdminRoute } from './AdminRoute.web.js';

vi.mock('../hooks/useIsAdmin.js', () => ({
  useIsAdmin: vi.fn(),
}));

import { useIsAdmin } from '../hooks/useIsAdmin.js';

const mockUseIsAdmin = vi.mocked(useIsAdmin);

function renderGuard(userId: string | undefined) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path='/admin'
          element={
            <AdminRoute supabase={{} as never} userId={userId}>
              <div>Admin content</div>
            </AdminRoute>
          }
        />
        <Route path='/login' element={<div>Login</div>} />
        <Route path='/not-authorized' element={<div>Denied</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    mockUseIsAdmin.mockReset();
  });

  it('redirects unauthenticated users to login', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    renderGuard(undefined);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('redirects non-admin users to not-authorized', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    renderGuard('user-1');
    expect(screen.getByText('Denied')).toBeInTheDocument();
  });

  it('shows loading state while admin check runs', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: true,
      error: null,
      refresh: async () => {},
    });
    renderGuard('user-1');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows loading state while auth is loading', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin'
            element={
              <AdminRoute supabase={{} as never} userId='user-1' authLoading>
                <div>Admin content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('shows recoverable error when admin check fails', async () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: new Error('network down'),
      refresh,
    });
    renderGuard('user-1');
    expect(screen.getByRole('alert')).toHaveTextContent('network down');
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Denied')).not.toBeInTheDocument();
  });

  it('renders children for admin users', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    renderGuard('admin-1');
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('re-runs admin check on window focus when tab is visible', () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    renderGuard('user-1');
    window.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('skips admin recheck on focus when tab is hidden', () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    renderGuard('user-1');
    window.dispatchEvent(new Event('focus'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('re-runs admin check on visibilitychange when tab becomes visible', () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    renderGuard('user-1');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls refresh when Try again is clicked', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: new Error('network down'),
      refresh,
    });
    const user = userEvent.setup();
    renderGuard('user-1');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('redirects to custom login and not-authorized paths', () => {
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    const routes = (
      <Routes>
        <Route
          path='/admin'
          element={
            <AdminRoute
              supabase={{} as never}
              userId={undefined}
              loginPath='/sign-in'
              notAuthorizedPath='/access-denied'
            >
              <div>Admin content</div>
            </AdminRoute>
          }
        />
        <Route path='/sign-in' element={<div>Sign in</div>} />
        <Route path='/access-denied' element={<div>Access denied</div>} />
      </Routes>
    );
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin']}>{routes}</MemoryRouter>
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin'
            element={
              <AdminRoute
                supabase={{} as never}
                userId='user-1'
                loginPath='/sign-in'
                notAuthorizedPath='/access-denied'
              >
                <div>Admin content</div>
              </AdminRoute>
            }
          />
          <Route path='/sign-in' element={<div>Sign in</div>} />
          <Route path='/access-denied' element={<div>Access denied</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('does not register visibility listeners without userId', () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      error: null,
      refresh,
    });
    renderGuard(undefined);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('skips admin recheck on visibilitychange when tab is hidden', () => {
    const refresh = vi.fn();
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    renderGuard('user-1');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('removes focus and visibility listeners on unmount', () => {
    const removeFocus = vi.spyOn(window, 'removeEventListener');
    const removeVisibility = vi.spyOn(document, 'removeEventListener');
    mockUseIsAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      error: null,
      refresh: async () => {},
    });
    const view = renderGuard('user-1');
    view.unmount();
    expect(removeFocus).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeVisibility).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    removeFocus.mockRestore();
    removeVisibility.mockRestore();
  });
});
