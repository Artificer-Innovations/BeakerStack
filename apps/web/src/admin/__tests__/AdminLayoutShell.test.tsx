import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayoutShell } from '../AdminLayoutShell';

describe('AdminLayoutShell', () => {
  it('renders nav and outlet for users path', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route element={<AdminLayoutShell />}>
            <Route path='users' element={<p>Users outlet</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Users outlet')).toBeInTheDocument();
  });

  it('uses dashboard-only breadcrumbs on non-users admin routes', () => {
    render(
      <MemoryRouter initialEntries={['/waitlist']}>
        <Routes>
          <Route element={<AdminLayoutShell />}>
            <Route path='waitlist' element={<p>Waitlist outlet</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Waitlist outlet')).toBeInTheDocument();
  });
});
