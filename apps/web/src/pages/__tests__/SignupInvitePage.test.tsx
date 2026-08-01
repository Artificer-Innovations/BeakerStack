import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { billingConfig } from '@adopter/config/billing';
import SignupInvitePage, {
  finalizeInviteSignup,
  getInviteTokenFromHash,
  INVITE_TOKEN_STORAGE_KEY,
} from '../SignupInvitePage';

const mockNavigate = vi.fn();
const invokeMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signUp: (...args: unknown[]) => authMocks.signUp(...args),
    signInWithGoogle: (...args: unknown[]) =>
      authMocks.signInWithGoogle(...args),
  }),
}));

vi.mock('@/components/AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => <header data-testid='app-header' />,
}));

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    emitLifecycleEvent: vi.fn(),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    auth: { getSession: (...args: unknown[]) => getSessionMock(...args) },
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
  supabaseRpc: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

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

describe('SignupInvitePage helpers', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    invokeMock.mockClear();
    rpcMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hash: '#token=abc123' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('getInviteTokenFromHash reads token from hash', () => {
    expect(getInviteTokenFromHash()).toBe('abc123');
  });

  it('finalizeInviteSignup consumes invite via waitlist-ops', async () => {
    const mem: Record<string, string> = { [INVITE_TOKEN_STORAGE_KEY]: 'x' };
    vi.stubGlobal('sessionStorage', storageMock(mem));
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, default_plan_id: 'beakerstack_pro' },
      error: null,
    });

    await finalizeInviteSignup('tok', 'u1', 'a@b.com');

    expect(invokeMock).toHaveBeenCalledWith(
      'waitlist-ops',
      expect.objectContaining({
        body: expect.objectContaining({
          action: 'consume',
          token: 'tok',
          productId: billingConfig.productId,
        }),
      })
    );
    expect(rpcMock).not.toHaveBeenCalled();
    expect(mem[INVITE_TOKEN_STORAGE_KEY]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('finalizeInviteSignup skips re-provision when already converted', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, already_converted: true },
      error: null,
    });
    await finalizeInviteSignup('tok', 'u1', 'a@b.com');
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('finalizeInviteSignup throws on invoke error', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'bad' } });
    await expect(finalizeInviteSignup('tok', 'u1', 'a@b.com')).rejects.toThrow(
      'bad'
    );
  });

  it('finalizeInviteSignup succeeds when consume returns ok without client billing', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await finalizeInviteSignup('tok', 'u1', 'a@b.com');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('finalizeInviteSignup throws on body error', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { error: 'expired' },
      error: null,
    });
    await expect(finalizeInviteSignup('tok', 'u1', undefined)).rejects.toThrow(
      'expired'
    );
  });
});

describe('SignupInvitePage', () => {
  const memSession: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    Object.keys(memSession).forEach(k => delete memSession[k]);
    vi.stubGlobal('sessionStorage', storageMock(memSession));
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hash: '#token=invite-tok' },
    });
    invokeMock.mockImplementation(async (_name, opts) => {
      const action = (opts as { body?: { action?: string } })?.body?.action;
      if (action === 'validate') {
        return {
          data: { valid: true, email: 'invited@example.com' },
          error: null,
        };
      }
      return { data: { default_plan_id: 'beakerstack_free' }, error: null };
    });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1', email: 'invited@example.com' },
        },
      },
      error: null,
    });
    rpcMock.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue(undefined);
    authMocks.signInWithGoogle.mockResolvedValue(undefined);
  });

  it('shows invalid state when no token is present', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hash: '' },
    });
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    expect(
      await screen.findByText(/invalid or has expired/i)
    ).toBeInTheDocument();
  });

  it('renders signup form for valid invite', async () => {
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    expect(
      await screen.findByText(/complete your signup/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('invited@example.com')).toBeDisabled();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('shows invalid when validate fails', async () => {
    invokeMock.mockImplementation(async (_name, opts) => {
      const action = (opts as { body?: { action?: string } })?.body?.action;
      if (action === 'validate') {
        return { data: { valid: false }, error: null };
      }
      return { data: {}, error: null };
    });
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    expect(
      await screen.findByText(/invalid or has expired/i)
    ).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/signup/invite#token=tok']}>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Password');
    await user.type(screen.getByPlaceholderText('Password'), 'short');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(
      await screen.findByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument();
  });

  it('shows password mismatch error', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Password');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'other');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument();
  });

  it('completes email signup and navigates to dashboard', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Password');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledWith(
        'invited@example.com',
        'password123'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows check email when session is missing after signup', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Password');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('stores token and calls Google sign-in', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByText(/sign up with google/i);
    await user.click(
      screen.getByRole('button', { name: /sign up with google/i })
    );

    expect(memSession[INVITE_TOKEN_STORAGE_KEY]).toBe('invite-tok');
    expect(authMocks.signInWithGoogle).toHaveBeenCalled();
  });

  it('shows generic message when email signup throws non-Error', async () => {
    authMocks.signUp.mockRejectedValueOnce('offline');
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Password');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(
      screen.getByPlaceholderText('Confirm password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Signup failed')).toBeInTheDocument();
  });

  it('shows error when Google signup fails', async () => {
    authMocks.signInWithGoogle.mockRejectedValueOnce(new Error('oauth down'));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupInvitePage />
      </MemoryRouter>
    );
    await screen.findByText(/sign up with google/i);
    await user.click(
      screen.getByRole('button', { name: /sign up with google/i })
    );
    expect(await screen.findByText('oauth down')).toBeInTheDocument();
  });
});
