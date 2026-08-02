import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AuthCallbackPage from '../AuthCallbackPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('../SignupInvitePage', () => ({
  finalizeInviteSignup: vi.fn().mockResolvedValue(undefined),
  INVITE_TOKEN_STORAGE_KEY: 'beakerstack_invite_token',
}));

const recoveryCallback = vi.hoisted(() => ({ active: false }));

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
  isPasswordRecoveryCallback: false,
  hasPasswordRecoveryCallback: () => recoveryCallback.active,
  clearPasswordRecoveryCallback: vi.fn(),
}));

// Mock react-router's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockSupabaseClient = (): SupabaseClient => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
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
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
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
    recoveryCallback.active = false;
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
    expect(
      screen.getByText('Completing authentication...')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while we complete your authentication...')
    ).toBeInTheDocument();
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
    expect(
      screen.getByText('Completing authentication...')
    ).toBeInTheDocument();
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
    expect(
      screen.getByText('Completing authentication...')
    ).toBeInTheDocument();
  });

  it('navigates to /reset-password when PASSWORD_RECOVERY event fires (not /dashboard)', async () => {
    vi.useRealTimers();
    // Simulate: user opens recovery link — session is established, type=recovery in hash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#access_token=rec-token&type=recovery',
      },
      writable: true,
      configurable: true,
    });

    const { supabase: mockSupabase } = await import('@/lib/supabase');
    // Fire the PASSWORD_RECOVERY event synchronously as soon as the component subscribes,
    // so the timing is deterministic (no need to capture and fire the callback separately).
    (
      mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation((cb: (event: string) => void) => {
      cb('PASSWORD_RECOVERY');
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const mockClient = createMockSupabaseClient();
    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AuthCallbackPage />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
        replace: true,
      });
    });
    // Must NOT navigate to /dashboard
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );
  });

  it('navigates to /dashboard on SIGNED_IN for OAuth (regression)', async () => {
    vi.useRealTimers();
    // Previous test sets a mockImplementation on onAuthStateChange that fires PASSWORD_RECOVERY.
    // vi.clearAllMocks() resets call counts but not implementations, so restore the default here.
    const { supabase: mockSupabase } = await import('@/lib/supabase');
    (
      mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

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
      data: { session: { user: mockUser, access_token: 'token' } },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '', hash: '' },
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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/reset-password',
      expect.anything()
    );
  });

  it('navigates to /dashboard for invite-type callback, not /reset-password (regression)', async () => {
    vi.useRealTimers();
    const { supabase: mockSupabase } = await import('@/lib/supabase');
    (
      mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#access_token=invite-tok&type=invite',
      },
      writable: true,
      configurable: true,
    });

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
      data: { session: { user: mockUser, access_token: 'invite-tok' } },
      error: null,
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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/reset-password',
      expect.anything()
    );
  });

  it('navigates to /reset-password when recovery flag is set and user is already signed in', async () => {
    vi.useRealTimers();
    recoveryCallback.active = true;

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

    const { supabase: mockSupabase } = await import('@/lib/supabase');
    (
      mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '', hash: '' },
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

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
          replace: true,
        });
      },
      { timeout: 3000 }
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );
  });

  it('navigates to /reset-password when recovery flag is set with access token but no type=recovery in hash', async () => {
    vi.useRealTimers();
    recoveryCallback.active = true;

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

    const { supabase: mockSupabase } = await import('@/lib/supabase');
    (
      mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '',
        hash: '#access_token=rec-token',
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

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
          replace: true,
        });
      },
      { timeout: 3000 }
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );
  });
});
