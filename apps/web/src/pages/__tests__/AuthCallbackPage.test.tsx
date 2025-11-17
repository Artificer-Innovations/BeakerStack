import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthCallbackPage from '../AuthCallbackPage';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockSupabaseClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  } as unknown as SupabaseClient;
};

const renderWithProviders = (
  component: React.ReactElement,
  initialEntries: string[] = ['/auth/callback']
) => {
  const mockClient = createMockSupabaseClient();
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          {component}
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('AuthCallbackPage', () => {
  const originalLocation = { ...window.location };
  const originalNavigate = window.history;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore window.location using Object.defineProperty
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    window.history = originalNavigate;
  });

  it('renders loading state initially', () => {
    renderWithProviders(<AuthCallbackPage />);
    expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while we complete your authentication...')
    ).toBeInTheDocument();
  });

  it.skip('displays error message when error is in query params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '?error=access_denied&error_description=User+cancelled',
        hash: '',
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<AuthCallbackPage />, [
      '/auth/callback?error=access_denied',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
      expect(screen.getByText(/user cancelled/i)).toBeInTheDocument();
    });
  });

  it.skip('displays error message when error is in hash params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#error=access_denied&error_description=User+cancelled',
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    });
  });

  it.skip('shows generic error message when error description is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '?error=access_denied',
        hash: '',
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });

  it.skip('redirects to login after error timeout', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '?error=access_denied',
        hash: '',
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<AuthCallbackPage />);

    // Fast-forward time to trigger redirect
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      // The component should show redirecting message
      expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
    });
  });

  it('handles successful OAuth callback with access token in hash', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#access_token=test-token&token_type=bearer',
      },
      writable: true,
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AuthCallbackPage />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should show loading state while processing
    expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
  });

  it('handles case when user is already authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '',
      },
      writable: true,
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AuthCallbackPage />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should show loading state
    expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
  });

  it.skip('shows error when token is present but user is not authenticated after timeout', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#access_token=test-token',
      },
      writable: true,
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AuthCallbackPage />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Fast-forward time
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText(/session not established/i)).toBeInTheDocument();
    });
  });
});
