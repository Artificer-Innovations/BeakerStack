import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';
import { AuthProvider } from '@shared/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockNavigate = vi.fn();

// Mock the supabase client import
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' },
        }),
      })),
    })),
  }));
  
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock database query for useProfile hook (returns profile not found, which is valid)
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' }, // Profile not found is OK
          }),
        })),
      })),
    }));
    
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any;
  });

  const renderWithAuth = async (ui: React.ReactElement) => {
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

  it('renders dashboard page', async () => {
    await renderWithAuth(<DashboardPage />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your Dashboard!')).toBeInTheDocument();
  });

  it('displays user email when authenticated', async () => {
    await renderWithAuth(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows sign out button', async () => {
    await renderWithAuth(<DashboardPage />);
    
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows home link', async () => {
    await renderWithAuth(<DashboardPage />);
    
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('calls signOut and navigates to home when sign out button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithAuth(<DashboardPage />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    
    await waitFor(() => {
      expect(mockSupabaseClient.auth!.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows loading state while signing out', async () => {
    const user = userEvent.setup();
    
    // Make signOut take some time
    mockSupabaseClient.auth!.signOut = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );
    
    await renderWithAuth(<DashboardPage />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    
    // Should show loading text
    expect(screen.getByText('Signing out...')).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();
    
    // Wait for sign out to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message if sign out fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to sign out';
    
    mockSupabaseClient.auth!.signOut = vi.fn().mockResolvedValue({
      error: { message: errorMessage },
    });
    
    await renderWithAuth(<DashboardPage />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // Button should be re-enabled after error
    expect(signOutButton).not.toBeDisabled();
  });

  it('does not navigate if sign out fails', async () => {
    const user = userEvent.setup();
    
    mockSupabaseClient.auth!.signOut = vi.fn().mockResolvedValue({
      error: { message: 'Sign out failed' },
    });
    
    await renderWithAuth(<DashboardPage />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    
    await waitFor(() => {
      expect(screen.getByText('Sign out failed')).toBeInTheDocument();
    });
    
    // Should NOT navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

