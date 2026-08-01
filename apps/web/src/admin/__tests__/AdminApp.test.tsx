import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router';
import AdminApp from '../AdminApp';

vi.mock('../AdminLayoutShell', () => ({
  AdminLayoutShell: () => <Outlet />,
}));

vi.mock('../pages/AdminDashboardPage', () => ({
  default: () => <p>Dashboard page</p>,
}));

vi.mock('../pages/AdminUsersPage', () => ({
  default: () => <p>Users page</p>,
}));

describe('AdminApp', () => {
  it('renders dashboard route at /admin', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AdminApp />
        </MemoryRouter>
      );
    });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('renders users route at /admin/users', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/users']}>
          <AdminApp />
        </MemoryRouter>
      );
    });
    expect(screen.getByText('Users page')).toBeInTheDocument();
  });
});
