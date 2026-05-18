import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';

describe('AdminDashboardPage', () => {
  it('renders dashboard heading and users card link', () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });
});
