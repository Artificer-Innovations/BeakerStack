import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotAuthorizedPage from '../NotAuthorizedPage';

vi.mock('@beakerstack/shared/components/navigation/AppHeader.web', () => ({
  AppHeader: () => <div data-testid='app-header'>header</div>,
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

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
