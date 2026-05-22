import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../ResetPasswordPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MIN_PASSWORD_LENGTH } from '@beakerstack/shared/constants/auth';

const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockNavigate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      updateUser: mockUpdateUser,
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => null,
}));

vi.mock('@beakerstack/shared/components/layout/ContentContainer.web', () => ({
  ContentContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockUser = {
  id: '1',
  email: 'user@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const createMockSupabaseClient = (): SupabaseClient => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  return {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: mockUpdateUser,
    },
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  } as unknown as SupabaseClient;
};

const renderPage = () => {
  const client = createMockSupabaseClient();
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <AuthProvider supabaseClient={client}>
        <ProfileProvider supabaseClient={client}>
          <ResetPasswordPage />
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /forgot-password when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password?expired=1', {
        replace: true,
      });
    });
  });

  it('renders the password form when a session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/^New password/i)).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText('Confirm new password')
    ).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/^New password/i)).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText(/^New password/i),
      'short'
    );
    await userEvent.type(
      screen.getByPlaceholderText('Confirm new password'),
      'short'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    );

    expect(
      screen.getByText(
        
      )
    ).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/^New password/i)).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText(/^New password/i),
      'newpassword1'
    );
    await userEvent.type(
      screen.getByPlaceholderText('Confirm new password'),
      'differentpass'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    );

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('calls updatePassword and navigates to /dashboard on success', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/^New password/i)).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText(/^New password/i),
      'newpassword1'
    );
    await userEvent.type(
      screen.getByPlaceholderText('Confirm new password'),
      'newpassword1'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    );

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows API error if updatePassword fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: {},
      error: { message: 'Password too weak' },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/^New password/i)).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText(/^New password/i),
      'newpassword1'
    );
    await userEvent.type(
      screen.getByPlaceholderText('Confirm new password'),
      'newpassword1'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    );

    await waitFor(() => {
      expect(screen.getByText('Password too weak')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );
  });
});
