import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AdminBreadcrumbs } from './AdminBreadcrumbs.web.js';

describe('AdminBreadcrumbs', () => {
  it('renders default label when items empty', () => {
    render(
      <MemoryRouter>
        <AdminBreadcrumbs />
      </MemoryRouter>
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders linked and current crumb', () => {
    render(
      <MemoryRouter>
        <AdminBreadcrumbs
          items={[{ label: 'Dashboard', to: '/admin' }, { label: 'Users' }]}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/admin'
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
