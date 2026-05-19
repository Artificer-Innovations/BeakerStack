import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  POST_AUTH_REDIRECT_KEY,
  serializePostAuthRedirectPayload,
} from '../../auth/postAuthRedirect';
import AuthCallbackPage from '../AuthCallbackPage';
import { INVITE_TOKEN_STORAGE_KEY } from '../SignupInvitePage';

const finalizeInviteSignupMock = vi.hoisted(() => vi.fn());

vi.mock('../SignupInvitePage', async importOriginal => {
  const actual = await importOriginal<typeof import('../SignupInvitePage')>();
  return {
    ...actual,
    finalizeInviteSignup: (...args: unknown[]) =>
      finalizeInviteSignupMock(...args),
  };
});

const mockNavigate = vi.fn();

const auth = vi.hoisted(() => ({
  user: null as { id: string; email?: string } | null,
  loading: true,
}));

const recoveryCallback = vi.hoisted(() => ({ active: false }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
  isPasswordRecoveryCallback: false,
  hasPasswordRecoveryCallback: () => recoveryCallback.active,
  clearPasswordRecoveryCallback: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: auth.user,
    loading: auth.loading,
    session: null,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

describe('AuthCallbackPage (URL + auth branches)', () => {
  const original = window.location;
  const memSession: Record<string, string> = {};
  const memLocal: Record<string, string> = {};

  function storageMock(mem: Record<string, string>) {
    return {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
      clear: () => {
        for (const k of Object.keys(mem)) delete mem[k];
      },
    };
  }

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    finalizeInviteSignupMock.mockReset();
    finalizeInviteSignupMock.mockResolvedValue(undefined);
    Object.keys(memSession).forEach(k => delete memSession[k]);
    Object.keys(memLocal).forEach(k => delete memLocal[k]);
    vi.stubGlobal('sessionStorage', storageMock(memSession));
    vi.stubGlobal('localStorage', storageMock(memLocal));
    auth.user = null;
    auth.loading = true;
    recoveryCallback.active = false;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        hash: '',
        search: '',
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: original,
    });
  });

  it('shows OAuth error from query and schedules redirect to login', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        hash: '',
        search: '?error=access_denied&error_description=User+cancelled',
      },
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback?error=access_denied']}>
          <AuthCallbackPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Authentication Error/i)).toBeInTheDocument();
    expect(screen.getByText(/User cancelled/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    vi.useRealTimers();
  });

  it('reads OAuth error from hash when query is empty', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '',
        hash: '#error=server_error&error_description=temp',
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/temp/i)).toBeInTheDocument();
  });

  it('uses generic copy when error_description is missing', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '?error=access_denied',
        hash: '',
      },
    });

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Authentication failed\. Please try again\./i)
    ).toBeInTheDocument();
  });

  it('redirects to dashboard when hash token present and session is ready', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '',
        hash: '#access_token=tok',
      },
    });
    auth.loading = false;
    auth.user = { id: 'u1', email: 'a@b.c' };

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthCallbackPage />
        </MemoryRouter>
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      replace: true,
    });
    vi.useRealTimers();
  });

  it('sets session error when token hash exists but user never appears', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '',
        hash: '#access_token=tok',
      },
    });
    auth.loading = false;
    auth.user = null;

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthCallbackPage />
        </MemoryRouter>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByText(/session not established/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    vi.useRealTimers();
  });

  it('redirects immediately when already signed in without hash or error', () => {
    auth.loading = false;
    auth.user = { id: 'u1' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      replace: true,
    });
  });

  it('redirects to stored post-auth path when session is ready', () => {
    const dest = '/billing/plans?plan=beakerstack_pro&welcome=1';
    memSession[POST_AUTH_REDIRECT_KEY] = serializePostAuthRedirectPayload(dest);
    auth.loading = false;
    auth.user = { id: 'u1' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(dest, { replace: true });
    expect(memSession[POST_AUTH_REDIRECT_KEY]).toBeUndefined();
    expect(memLocal[POST_AUTH_REDIRECT_KEY]).toBeUndefined();
  });

  it('does not navigate when no token is present and user is signed out', () => {
    auth.loading = false;
    auth.user = null;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        hash: '',
        search: '',
      },
    });
    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('finalizes invite signup when invite token is stored', async () => {
    memSession[INVITE_TOKEN_STORAGE_KEY] = 'invite-tok';
    auth.loading = false;
    auth.user = { id: 'u1', email: 'a@b.com' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(finalizeInviteSignupMock).toHaveBeenCalledWith(
        'invite-tok',
        'u1',
        'a@b.com'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows error when invite finalization fails', async () => {
    finalizeInviteSignupMock.mockRejectedValueOnce(new Error('fail'));
    memSession[INVITE_TOKEN_STORAGE_KEY] = 'invite-tok';
    auth.loading = false;
    auth.user = { id: 'u1', email: 'a@b.com' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/could not complete invite signup/i)
    ).toBeInTheDocument();
  });

  it('redirects to login after invite finalization fails', async () => {
    vi.useFakeTimers();
    finalizeInviteSignupMock.mockRejectedValueOnce(new Error('fail'));
    memSession[INVITE_TOKEN_STORAGE_KEY] = 'invite-tok';
    auth.loading = false;
    auth.user = { id: 'u1', email: 'a@b.com' };

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthCallbackPage />
        </MemoryRouter>
      );
      await Promise.resolve();
    });

    expect(
      screen.getByText(/could not complete invite signup/i)
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    vi.useRealTimers();
  });

  it('redirects on delayed timer when user appears after access token', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '',
        hash: '#access_token=tok',
      },
    });
    auth.loading = false;
    auth.user = null;

    const { rerender } = render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    auth.user = { id: 'u1', email: 'a@b.com' };
    rerender(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    vi.useRealTimers();
  });

  it('reads localStorage when sessionStorage is empty', () => {
    const dest = '/billing/plans?plan=beakerstack_max&welcome=1';
    memLocal[POST_AUTH_REDIRECT_KEY] = serializePostAuthRedirectPayload(dest);
    auth.loading = false;
    auth.user = { id: 'u1' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(dest, { replace: true });
    expect(memLocal[POST_AUTH_REDIRECT_KEY]).toBeUndefined();
  });

  it('redirects to reset-password when already signed in with recovery callback flag', async () => {
    vi.useFakeTimers();
    recoveryCallback.active = true;
    auth.loading = false;
    auth.user = { id: 'u1' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
      replace: true,
    });
    vi.useRealTimers();
  });

  it('redirects to reset-password when recovery flag is set and access token hash has no type=recovery', async () => {
    vi.useFakeTimers();
    recoveryCallback.active = true;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '',
        hash: '#access_token=tok',
      },
    });
    auth.loading = false;
    auth.user = { id: 'u1', email: 'a@b.c' };

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.anything()
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
      replace: true,
    });
    vi.useRealTimers();
  });
});
