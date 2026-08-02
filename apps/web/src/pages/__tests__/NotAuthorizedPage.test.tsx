import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NotAuthorizedPage from '../NotAuthorizedPage';

vi.mock('@/components/AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => <div data-testid='app-header'>header</div>,
}));

describe('NotAuthorizedPage', () => {
  it('renders not authorized message and dashboard link', () => {
    render(
      <MemoryRouter>
        <NotAuthorizedPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Not authorized')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to dashboard/i })
    ).toHaveAttribute('href', '/dashboard');
  });
});
