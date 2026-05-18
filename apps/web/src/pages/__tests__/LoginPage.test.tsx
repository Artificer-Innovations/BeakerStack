import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import LoginPage from '../LoginPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

const webAuthFns = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

const mockCatalogPlans = vi.hoisted(() => {
  const pro: Plan = {
    id: 'beakerstack_pro',
    product_id: 'beakerstack',
    display_name: 'Pro',
    description: null,
    price_cents: 1900,
    billing_period: 'monthly',
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_product_id: null,
    features: {},
    usage_limits: {},
    trial_period_days: 0,
    is_public: true,
    display_order: 2,
  };
  return { pro };
});

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    BillingProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    usePlanCatalog: () => ({
      plans: [mockCatalogPlans.pro],
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
  };
});

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
      signInWithPassword: webAuthFns.signInWithPassword,
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: webAuthFns.signInWithOAuth,
    },
  } as unknown as SupabaseClient;
};

type MemoryRouterInitialEntries = NonNullable<
  React.ComponentProps<typeof MemoryRouter>['initialEntries']
>;

const renderWithProviders = (
  component: React.ReactElement,
  options?: { initialEntries?: MemoryRouterInitialEntries }
) => {
  const mockClient = createMockSupabaseClient();
  const router =
    options?.initialEntries != null ? (
      <MemoryRouter initialEntries={options.initialEntries}>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            {component}
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            {component}
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  return render(router);
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webAuthFns.signInWithPassword.mockReset();
    webAuthFns.signInWithOAuth.mockReset();
    webAuthFns.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    webAuthFns.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  });

  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    // Get the submit button specifically (not the header button)
    const submitButtons = screen.getAllByRole('button', { name: /sign in/i });
    expect(submitButtons.length).toBeGreaterThan(0);
  });

  it('renders Google sign-in button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('shows error when email or password is empty', async () => {
    renderWithProviders(<LoginPage />);
    const form = screen.getByPlaceholderText('Email address').closest('form');
    expect(form).toBeInstanceOf(HTMLFormElement);
    form?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('submits form with email and password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Verify form values are set correctly
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup();
    webAuthFns.signInWithPassword.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves — loading state */
        })
    );
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    webAuthFns.signInWithPassword.mockRejectedValue(new Error('Invalid'));
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
  });

  it('shows generic copy when sign-in rejects with non-Error', async () => {
    const user = userEvent.setup();
    webAuthFns.signInWithPassword.mockRejectedValue('offline');
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('Email address');
    await user.type(emailInput, 'a@b.com');
    await user.type(screen.getByPlaceholderText('Password'), 'pw');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector('button[type="submit"]') as
      | HTMLButtonElement
      | undefined;
    if (!submitButton) {
      throw new Error('expected email/password form submit button');
    }
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Failed to sign in')).toBeInTheDocument();
    });
  });

  it('shows generic copy when Google sign-in rejects with non-Error', async () => {
    const user = userEvent.setup();
    webAuthFns.signInWithOAuth.mockRejectedValue('no oauth');
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByText('Sign in with Google'));
    await waitFor(() => {
      expect(
        screen.getByText('Failed to sign in with Google')
      ).toBeInTheDocument();
    });
  });

  it('has link to signup page', () => {
    renderWithProviders(<LoginPage />);
    const signupLink = screen.getByText("Don't have an account? Sign up");
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
  });

  it('shows plan summary aside when arriving with paid plan query', () => {
    renderWithProviders(<LoginPage />, {
      initialEntries: ['/login?plan=beakerstack_pro'],
    });
    expect(screen.getByText('Plan from pricing')).toBeInTheDocument();
  });

  it('does not show plan aside on plain /login', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.queryByText('Plan from pricing')).not.toBeInTheDocument();
  });

  it('accepts location.state.from for post-auth redirect path', () => {
    renderWithProviders(<LoginPage />, {
      initialEntries: [{ pathname: '/login', state: { from: '/admin' } }],
    });
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('disables form inputs when loading', async () => {
    const user = userEvent.setup();
    webAuthFns.signInWithPassword.mockImplementation(
      () =>
        new Promise(() => {
          /* hang */
        })
    );
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const form = emailInput.closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    if (submitButton) {
      await user.click(submitButton);
    }

    // Inputs should be disabled during loading
    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
