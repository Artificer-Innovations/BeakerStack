import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import type { UseSignupModeResult } from '@beakerstack/waitlist';
import SignupPage from '../SignupPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { POST_AUTH_REDIRECT_KEY } from '../../auth/postAuthRedirect';
import { MIN_PASSWORD_LENGTH } from '@beakerstack/shared/constants/auth';

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

const { defaultSignupMode, useSignupModeMock } = vi.hoisted(() => {
  const defaultSignupMode: UseSignupModeResult = {
    mode: 'open',
    settings: null,
    loading: false,
    isOpen: true,
    isWaitlist: false,
    isInviteOnly: false,
    isClosed: false,
  };
  return {
    defaultSignupMode,
    useSignupModeMock: vi.fn((): UseSignupModeResult => defaultSignupMode),
  };
});

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    useSignupMode: useSignupModeMock,
  };
});

vi.mock('@beakerstack/waitlist/web', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@beakerstack/waitlist/web')>();
  return {
    ...actual,
    SignupModeGate: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useSignupMode: useSignupModeMock,
  };
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

const webSupabaseAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const authClientMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the supabase client (SignupPage calls getSession on this module)
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => webSupabaseAuth.getSession(...args),
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
      signUp: (...args: unknown[]) => authClientMocks.signUp(...args),
      signOut: vi.fn(),
      signInWithOAuth: (...args: unknown[]) =>
        authClientMocks.signInWithOAuth(...args),
    },
  } as unknown as SupabaseClient;
};

const renderWithProviders = (
  component: React.ReactElement,
  options?: { initialEntries?: string[] }
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

/** Avoid flaky jsdom `Storage` after prototype spies / Supabase auth touching storage. */
function installMemoryWebStorage() {
  const make = (): Storage => {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      clear: () => {
        map.clear();
      },
      getItem: (key: string) => {
        const v = map.get(key);
        return v === undefined ? null : v;
      },
      key: (index: number) => [...map.keys()][index] ?? null,
      removeItem: (key: string) => {
        map.delete(key);
      },
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    } as Storage;
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: make(),
    writable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: make(),
    writable: true,
  });
}

/**
 * BillingProvider calls `getSession` before submit; return a session only after email `signUp`.
 */
function mockGetSessionForAuthFlow(options: { sessionAfterSignup: boolean }) {
  webSupabaseAuth.getSession.mockImplementation(async () => {
    if (!options.sessionAfterSignup) {
      return { data: { session: null }, error: null };
    }
    const afterEmailSignup = authClientMocks.signUp.mock.calls.length > 0;
    if (!afterEmailSignup) {
      return { data: { session: null }, error: null };
    }
    return {
      data: {
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer' as const,
          user: {
            id: 'u1',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'a@b.com',
            app_metadata: {},
            user_metadata: {},
            created_at: '',
          },
        },
      },
      error: null,
    };
  });
}

describe('SignupPage', () => {
  beforeEach(() => {
    installMemoryWebStorage();
    vi.clearAllMocks();
    useSignupModeMock.mockReturnValue(defaultSignupMode);
    mockNavigate.mockClear();
    webSupabaseAuth.getSession.mockImplementation(async () => ({
      data: { session: null },
      error: null,
    }));
    authClientMocks.signUp.mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    });
    authClientMocks.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: null },
      error: null,
    });
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

  it('shows error when fields are empty', async () => {
    renderWithProviders(<SignupPage />);

    const form = screen.getByPlaceholderText('Email address').closest('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected signup form');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    await user.type(
      screen.getByPlaceholderText('Email address'),
      'test@example.com'
    );
    await user.type(screen.getByPlaceholderText('Password'), 'short');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'short');

    const form = screen.getByPlaceholderText('Email address').closest('form');
    const submitButton = form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(
        screen.getByText(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        )
      ).toBeInTheDocument();
    });
    expect(authClientMocks.signUp).not.toHaveBeenCalled();
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

  it('displays error message on signup failure', async () => {
    const user = userEvent.setup();
    authClientMocks.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: {
        message: 'User already registered',
        name: 'AuthApiError',
        status: 422,
      },
    });

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

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument();
    });
  });

  it('navigates to billing plans after signup when session exists and plan intent is paid', async () => {
    const user = userEvent.setup();
    mockGetSessionForAuthFlow({ sessionAfterSignup: true });

    renderWithProviders(<SignupPage />, {
      initialEntries: ['/signup?plan=beakerstack_pro'],
    });

    await user.type(
      screen.getByPlaceholderText('Email address'),
      'new@example.com'
    );
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(
      screen.getByRole('button', { name: /Continue with Pro/i })
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/billing/plans?plan=beakerstack_pro&welcome=1',
        { replace: true }
      );
    });
  });

  it('navigates to dashboard after signup when session exists and there is no paid plan intent', async () => {
    const user = userEvent.setup();
    mockGetSessionForAuthFlow({ sessionAfterSignup: true });

    renderWithProviders(<SignupPage />, { initialEntries: ['/signup'] });

    await user.type(
      screen.getByPlaceholderText('Email address'),
      'new@example.com'
    );
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows check your email and stores redirect when signup succeeds without session and paid plan intent', async () => {
    const user = userEvent.setup();

    renderWithProviders(<SignupPage />, {
      initialEntries: ['/signup?plan=beakerstack_pro'],
    });

    await user.type(
      screen.getByPlaceholderText('Email address'),
      'pending@example.com'
    );
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(
      screen.getByRole('button', { name: /Continue with Pro/i })
    );

    await waitFor(() => expect(authClientMocks.signUp).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText(/pending@example.com/)).toBeInTheDocument();
    });

    const raw = window.localStorage.getItem(POST_AUTH_REDIRECT_KEY);
    expect(raw).toBeTruthy();
    expect(raw).toContain('/billing/plans');
  });

  it('navigates to dashboard after signup when no session and no paid plan intent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />, { initialEntries: ['/signup'] });

    await user.type(
      screen.getByPlaceholderText('Email address'),
      'confirm@example.com'
    );
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows generic message when email signup throws non-Error', async () => {
    const user = userEvent.setup();
    authClientMocks.signUp.mockRejectedValueOnce('offline');
    renderWithProviders(<SignupPage />);
    await user.type(screen.getByPlaceholderText('Email address'), 'x@y.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Failed to create account')).toBeInTheDocument();
    });
  });

  it('clears OAuth stash and shows error when Google signup fails', async () => {
    const user = userEvent.setup();
    authClientMocks.signInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: null },
      error: {
        message: 'OAuth provider unavailable',
        name: 'AuthApiError',
        status: 503,
      },
    });

    const removeSpy = vi.spyOn(window.sessionStorage, 'removeItem');

    renderWithProviders(<SignupPage />, {
      initialEntries: ['/signup?plan=beakerstack_pro'],
    });

    await user.click(
      screen.getByRole('button', { name: /Sign up with Google/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText('OAuth provider unavailable')
      ).toBeInTheDocument();
    });

    expect(authClientMocks.signInWithOAuth).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(POST_AUTH_REDIRECT_KEY);
    removeSpy.mockRestore();
  });

  it('has link to login page', () => {
    renderWithProviders(<SignupPage />);
    const loginLink = screen.getByText('Already have an account? Sign in');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('shows paid funnel CTA when arriving from pricing with Pro plan', () => {
    renderWithProviders(<SignupPage />, {
      initialEntries: ['/signup?plan=beakerstack_pro'],
    });
    expect(
      screen.getByRole('button', { name: /Continue with Pro/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Your selection')).toBeInTheDocument();
  });

  it('does not show plan aside copy on plain /signup', () => {
    renderWithProviders(<SignupPage />);
    expect(screen.queryByText('Your selection')).not.toBeInTheDocument();
  });

  it('shows waitlist tier panel without open-signup heading in waitlist mode', () => {
    useSignupModeMock.mockReturnValue({
      mode: 'waitlist',
      settings: null,
      loading: false,
      isOpen: false,
      isWaitlist: true,
      isInviteOnly: false,
      isClosed: false,
    });
    renderWithProviders(<SignupPage />, {
      initialEntries: ['/signup?plan=beakerstack_pro'],
    });
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument();
    expect(screen.getByText('JOIN THE WAITLIST FOR')).toBeInTheDocument();
  });
});
