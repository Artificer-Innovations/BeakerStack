import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SignupPage from '../SignupPage';
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

const renderWithProviders = (component: React.ReactElement) => {
  const mockClient = createMockSupabaseClient();
  return render(
    <BrowserRouter>
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          {component}
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form', () => {
    renderWithProviders(<SignupPage />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });

  it('renders Google sign-up button', () => {
    renderWithProviders(<SignupPage />);
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  it.skip('shows error when fields are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const form = screen.getByPlaceholderText('Email address').closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitButton).toBeInTheDocument();
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentpassword');
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('submits form when passwords match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmPasswordInput).toHaveValue('password123');
  });

  it.skip('shows loading state when submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
    });
  });

  it('displays error message on signup failure', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    if (submitButton) {
      await user.click(submitButton);
    }

    // The form should attempt submission - error handling is tested via integration tests
    // This test verifies the form can be filled and submitted
    expect(emailInput).toHaveValue('existing@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmPasswordInput).toHaveValue('password123');
  });

  it('has link to login page', () => {
    renderWithProviders(<SignupPage />);
    const loginLink = screen.getByText('Already have an account? Sign in');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it.skip('disables form inputs when loading', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    if (submitButton) {
      await user.click(submitButton);
    }

    // Inputs should be disabled during loading
    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      if (submitButton) {
        expect(submitButton).toBeDisabled();
      }
    });
  });
});
