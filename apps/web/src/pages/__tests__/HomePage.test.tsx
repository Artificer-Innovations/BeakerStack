import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { AuthProvider } from '@shared/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('HomePage', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = async (ui: React.ReactElement, authenticated = false) => {
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: authenticated ? {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
              },
            } : null,
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    } as any;

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <BrowserRouter>
          <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
            {ui}
          </AuthProvider>
        </BrowserRouter>
      );
      // Wait for the getSession promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    return result!;
  };

  describe('when user is not authenticated', () => {
    it('renders home page with title and subtitle', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.getByText('Welcome to Demo App')).toBeInTheDocument();
      expect(screen.getByText(/A modern full-stack application/i)).toBeInTheDocument();
    });

    it('shows sign in button', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows sign up button', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    it('does not show dashboard link', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.queryByRole('link', { name: /go to dashboard/i })).not.toBeInTheDocument();
    });

    it('does not show signed in message', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    it('shows signed in message with user email', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        expect(screen.getByText(/signed in as test@example.com/i)).toBeInTheDocument();
      });
    });

    it('shows dashboard link', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
      });
    });

    it('does not show sign in button', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /^sign in$/i })).not.toBeInTheDocument();
      });
    });

    it('does not show sign up button', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
      });
    });

    it('dashboard link points to correct route', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  describe('test database button', () => {
    it('shows test database button regardless of auth state', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.getByRole('button', { name: /test database/i })).toBeInTheDocument();
    });

    it('shows test database button when authenticated', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /test database/i })).toBeInTheDocument();
      });
    });
  });

  describe('auth context debug UI', () => {
    it('displays auth context debug information', async () => {
      await renderWithAuth(<HomePage />, false);
      
      expect(screen.getByText('🧪 AuthContext Test')).toBeInTheDocument();
      expect(screen.getByText(/Loading:/)).toBeInTheDocument();
      expect(screen.getByText(/User:/)).toBeInTheDocument();
      expect(screen.getByText(/Session:/)).toBeInTheDocument();
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    it('shows user email in debug UI when authenticated', async () => {
      await renderWithAuth(<HomePage />, true);
      
      await waitFor(() => {
        const debugUI = screen.getByText(/User:/).parentElement;
        expect(debugUI).toHaveTextContent('test@example.com');
      });
    });

    it('shows null in debug UI when not authenticated', async () => {
      await renderWithAuth(<HomePage />, false);
      
      await waitFor(() => {
        const debugUI = screen.getByText(/User:/).parentElement;
        expect(debugUI).toHaveTextContent('null');
      });
    });
  });
});

