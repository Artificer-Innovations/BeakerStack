import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PolicyPublicHeader } from '../PolicyPublicHeader';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

describe('PolicyPublicHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows Sign In and Sign Up when no session hint', () => {
    render(
      <MemoryRouter>
        <PolicyPublicHeader />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute(
      'href',
      '/signup'
    );
  });

  it('shows Go to dashboard when session hint is present', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt', refresh_token: 'r' })
    );
    render(
      <MemoryRouter>
        <PolicyPublicHeader />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' })
    ).toHaveAttribute('href', '/dashboard');
    expect(
      screen.queryByRole('link', { name: 'Sign In' })
    ).not.toBeInTheDocument();
  });
});
