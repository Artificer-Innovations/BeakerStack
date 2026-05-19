import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../ForgotPasswordPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockRequestPasswordReset = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      resetPasswordForEmail: mockRequestPasswordReset,
    },
  },
}));

vi.mock('@beakerstack/shared/components/navigation/AppHeader.web', () => ({
  AppHeader: () => null,
}));

vi.mock('@beakerstack/shared/components/layout/ContentContainer.web', () => ({
  ContentContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const createMockSupabaseClient = (): SupabaseClient =>
  ({
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
      resetPasswordForEmail: mockRequestPasswordReset,
      updateUser: vi.fn(),
    },
  }) as unknown as SupabaseClient;

const renderPage = (path = '/forgot-password') => {
  const client = createMockSupabaseClient();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider supabaseClient={client}>
        <ProfileProvider supabaseClient={client}>
          <ForgotPasswordPage />
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows expired-link banner when ?expired=1 is present', () => {
    renderPage('/forgot-password?expired=1');
    expect(
      screen.getByText(/Your password reset link has expired/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
  });

  it('does not show expired-link banner on normal visit', () => {
    renderPage();
    expect(
      screen.queryByText(/Your password reset link has expired/i)
    ).not.toBeInTheDocument();
  });

  it('renders the email form', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send reset link' })
    ).toBeInTheDocument();
  });

  it('shows error when submitted with no email', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(
      screen.getByText('Please enter your email address')
    ).toBeInTheDocument();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('calls requestPasswordReset and shows non-enumerating success message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ data: {}, error: null });
    renderPage();

    await userEvent.type(
      screen.getByPlaceholderText('Email address'),
      'user@example.com'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });

    expect(
      screen.getByText(/If an account exists for/i)
    ).toBeInTheDocument();
    // Must not reveal whether the address exists
    expect(
      screen.queryByText(/account does not exist/i)
    ).not.toBeInTheDocument();
  });

  it('shows generic error message on failure', async () => {
    mockRequestPasswordReset.mockRejectedValue(new Error('Rate limit exceeded'));
    renderPage();

    await userEvent.type(
      screen.getByPlaceholderText('Email address'),
      'user@example.com'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('has a link back to login', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});
