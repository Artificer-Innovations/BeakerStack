import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout.web.js';

const navItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
];

describe('AdminLayout', () => {
  it('renders without optional breadcrumbs or header', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin/*'
            element={<AdminLayout title='Ops' navItems={navItems} />}
          >
            <Route index element={<p>Home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders nav, breadcrumbs, header slot, and outlet', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path='/admin/*'
            element={
              <AdminLayout
                title='Ops'
                navItems={navItems}
                breadcrumbs={[
                  { label: 'Dashboard', to: '/admin' },
                  { label: 'Users' },
                ]}
                headerRight={<button type='button'>Action</button>}
              />
            }
          >
            <Route path='users' element={<p>Page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders sidebarFooter content when provided', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin/*'
            element={
              <AdminLayout
                title='Ops'
                navItems={navItems}
                sidebarFooter={<button type='button'>Sign out</button>}
              />
            }
          >
            <Route index element={<p>Home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('renders no footer section when sidebarFooter is omitted', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin/*'
            element={<AdminLayout title='Ops' navItems={navItems} />}
          >
            <Route index element={<p>Home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('sidebar-footer')).not.toBeInTheDocument();
  });
});
