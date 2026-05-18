import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
});
