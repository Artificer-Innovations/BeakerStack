import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HOME_TITLE, HOME_SUBTITLE } from '@shared/utils/strings';

// Mock environment variables to prevent real Supabase client creation
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock the supabase client used by DebugTools
vi.mock('@/lib/supabase', () => {
  const mockSingle = vi.fn().mockResolvedValue({
    data: null,
    error: { code: 'PGRST116', message: 'No rows returned' },
  });

  const mockEq = vi.fn(() => ({
    single: mockSingle,
  }));

  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    limit: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  }));

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }));

  interface MockChannel {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  }

  const createMockChannel = (): MockChannel => {
    const channel = {} as MockChannel;

    channel.on = vi.fn().mockImplementation(() => channel);
    channel.subscribe = vi
      .fn()
      .mockImplementation((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return channel;
      });
    channel.unsubscribe = vi
      .fn()
      .mockResolvedValue({ status: 'ok', error: null });

    return channel;
  };

  return {
    supabase: {
      from: mockFrom,
      channel: vi.fn().mockImplementation(createMockChannel),
      removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
    },
  };
});

describe('HomePage', () => {
  let mockSupabaseClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = async (
    ui: React.ReactElement,
    authenticated = false
  ) => {
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: authenticated
              ? {
                  user: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                  },
                }
              : null,
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
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: 'PGRST116',
                message: 'The result contains 0 rows',
                details: null,
                hint: null,
              },
            }),
          }),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // Add channel and removeChannel methods to mock
    const clientWithRealtime =
      mockSupabaseClient as typeof mockSupabaseClient & {
        channel: ReturnType<typeof vi.fn>;
        removeChannel: ReturnType<typeof vi.fn>;
      };
    clientWithRealtime.channel = vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(callback => {
        callback('SUBSCRIBED');
        return { on: vi.fn().mockReturnThis(), subscribe: vi.fn() };
      }),
    });
    clientWithRealtime.removeChannel = vi
      .fn()
      .mockResolvedValue({ status: 'ok', error: null });

    let result: ReturnType<typeof render> | null = null;
    await act(async () => {
      result = render(
        <BrowserRouter>
          <AuthProvider supabaseClient={mockSupabaseClient}>
            <ProfileProvider supabaseClient={mockSupabaseClient}>
              {ui}
            </ProfileProvider>
          </AuthProvider>
        </BrowserRouter>
      );
      // Wait for the getSession promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    if (!result) {
      throw new Error('Failed to render HomePage test component');
    }
    return result;
  };

  describe('when user is not authenticated', () => {
    it('renders home page with title and subtitle', async () => {
      await renderWithAuth(<HomePage />, false);

      // Title appears in both header and main content, check that it exists
      const titles = screen.getAllByText(HOME_TITLE);
      expect(titles.length).toBeGreaterThan(0);
      expect(
        screen.getByText(HOME_SUBTITLE)
      ).toBeInTheDocument();
    });

    it('shows sign in button', async () => {
      await renderWithAuth(<HomePage />, false);

      // Sign In appears in both header and main content
      const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
      expect(signInLinks.length).toBeGreaterThan(0);
    });

    it('shows sign up button', async () => {
      await renderWithAuth(<HomePage />, false);

      // Sign Up appears in both header and main content
      const signUpLinks = screen.getAllByRole('link', { name: /sign up/i });
      expect(signUpLinks.length).toBeGreaterThan(0);
    });

    it('does not show dashboard link', async () => {
      await renderWithAuth(<HomePage />, false);

      expect(
        screen.queryByRole('link', { name: /go to dashboard/i })
      ).not.toBeInTheDocument();
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
        // The HomePage shows "Logged in as {email}" in the main content
        expect(
          screen.getByText(/logged in as test@example.com/i)
        ).toBeInTheDocument();
      });
    });

    it('shows dashboard link in main content', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /go to dashboard/i })
        ).toBeInTheDocument();
      });
    });

    it('shows profile link in main content', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /view profile/i })
        ).toBeInTheDocument();
      });
    });

    it('shows navigation menu with dashboard and profile links', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        // Check navigation header has Dashboard and Profile links
        const dashboardNavLinks = screen.getAllByRole('link', {
          name: /dashboard/i,
        });
        const profileNavLinks = screen.getAllByRole('link', {
          name: /profile/i,
        });
        expect(dashboardNavLinks.length).toBeGreaterThan(0);
        expect(profileNavLinks.length).toBeGreaterThan(0);
      });
    });

    it('does not show sign in button in main content', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        // Sign In may appear in header navigation, but not in main content area
        // Check that main content area doesn't have sign in
        const mainContent = screen
          .getByText(/Go to Dashboard/i)
          .closest('div[class*="max-w-md"]');
        expect(mainContent).not.toHaveTextContent(/sign in/i);
      });
    });

    it('does not show sign up button in main content', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        // Sign Up may appear in header navigation, but not in main content area
        const mainContent = screen
          .getByText(/Go to Dashboard/i)
          .closest('div[class*="max-w-md"]');
        expect(mainContent).not.toHaveTextContent(/sign up/i);
      });
    });

    it('dashboard link points to correct route', async () => {
      await renderWithAuth(<HomePage />, true);

      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', {
          name: /go to dashboard/i,
        });
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  // Note: Debug tools (database test, auth context test) are now in DebugTools component
  // which is hidden by default and activated via 4 clicks in bottom left corner.
  // These tests have been removed as the debug components are no longer directly visible.
});
