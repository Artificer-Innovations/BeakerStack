import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminInviteByEmailPanel } from '../components/AdminInviteByEmailPanel.web';

const mockInvite = vi.fn();
const mockSettings = vi.fn();
const mockEmit = vi.fn();
const mockInvoke = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    getAdminWaitlistSettings: (...args: unknown[]) => mockSettings(...args),
    inviteWaitlistEmail: (...args: unknown[]) => mockInvite(...args),
    emitLifecycleEvent: (...args: unknown[]) => mockEmit(...args),
    buildInviteUrl: (origin: string, token: string) =>
      `${origin}/signup/invite#token=${token}`,
  };
});

describe('AdminInviteByEmailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.mockResolvedValue({ signup_mode: 'invite_only' });
    mockInvite.mockResolvedValue({
      ok: true,
      invite_token: 'secret',
      email: 'invitee@example.com',
      entry_id: 'e1',
    });
    mockInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it('shows invite-only helper copy', async () => {
    render(<AdminInviteByEmailPanel />);
    expect(
      await screen.findByText(/signup is invite-only/i)
    ).toBeInTheDocument();
  });

  it('creates invite and shows link', async () => {
    const onInvited = vi.fn();
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel onInvited={onInvited} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      'invitee@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockInvite).toHaveBeenCalled();
    });
    expect(onInvited).toHaveBeenCalled();
    expect(
      screen.getByText(/invite created for invitee@example.com/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/signup\/invite#token=secret/)).toBeInTheDocument();
  });

  it('shows general copy when signup mode is not invite-only', async () => {
    mockSettings.mockResolvedValue({ signup_mode: 'waitlist' });
    render(<AdminInviteByEmailPanel />);
    expect(
      await screen.findByText(
        /create an invite for someone who is not on the waitlist/i
      )
    ).toBeInTheDocument();
  });

  it('maps invalid email errors', async () => {
    mockInvite.mockResolvedValue({ error: 'invalid_email' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /valid email address/i
    );
  });

  it('maps permission errors', async () => {
    mockInvite.mockResolvedValue({ error: 'not_found' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(
      screen.getByLabelText(/email address/i),
      'denied@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission/i);
  });

  it('shows error when invite response is missing token', async () => {
    mockInvite.mockResolvedValue({ ok: true, email: 'a@b.com' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invite was not created/i
    );
  });

  it('shows mapped error for converted email', async () => {
    mockInvite.mockResolvedValue({ error: 'already_converted' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);

    await user.type(
      screen.getByLabelText(/email address/i),
      'done@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already completed signup/i
    );
  });
});
