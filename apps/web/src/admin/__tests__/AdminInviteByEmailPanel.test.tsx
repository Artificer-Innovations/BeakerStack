import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('falls back to raw error code when unrecognized', async () => {
    mockInvite.mockResolvedValue({ error: 'unexpected_thing' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'unexpected_thing'
    );
  });

  it('uses generic copy when invite throws a non-Error value', async () => {
    mockInvite.mockRejectedValue('boom');
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not create invite/i
    );
  });

  it('handles missing signup_mode (renders general copy)', async () => {
    mockSettings.mockResolvedValue(null);
    render(<AdminInviteByEmailPanel />);
    expect(
      await screen.findByText(/create an invite for someone who is not on the/i)
    ).toBeInTheDocument();
  });

  it('skips submission when email is only whitespace', async () => {
    const user = userEvent.setup();
    const onInvited = vi.fn();
    render(<AdminInviteByEmailPanel onInvited={onInvited} />);
    const input = screen.getByLabelText(/email address/i);
    await user.type(input, ' ');
    const form = input.closest('form');
    if (!form) throw new Error('expected form');
    fireEvent.submit(form);
    expect(mockInvite).not.toHaveBeenCalled();
    expect(onInvited).not.toHaveBeenCalled();
  });

  it('copies invite link via clipboard when Copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<AdminInviteByEmailPanel />);
    await user.type(
      screen.getByLabelText(/email address/i),
      'invitee@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    const copyBtn = await screen.findByRole('button', {
      name: /copy invite link/i,
    });
    await user.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/signup/invite#token=secret')
    );
  });

  it('requires a VIP reason when complimentary access is enabled', async () => {
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await screen.findByText(/signup is invite-only/i);
    await user.click(
      screen.getByRole('checkbox', {
        name: /grant complimentary vip on signup/i,
      })
    );
    await user.type(screen.getByLabelText(/email address/i), 'vip@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reason when granting vip access/i
    );
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it('sends invite with provisioning intent when VIP is enabled', async () => {
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await screen.findByText(/signup is invite-only/i);
    await user.click(
      screen.getByRole('checkbox', {
        name: /grant complimentary vip on signup/i,
      })
    );
    await user.type(
      screen.getByLabelText(/^reason \(required\)$/i),
      'Design partner'
    );
    await user.type(screen.getByLabelText(/email address/i), 'vip@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(mockInvite).toHaveBeenCalled());
    expect(mockInvite).toHaveBeenCalledWith(
      expect.anything(),
      'vip@example.com',
      expect.objectContaining({
        provisioningIntent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'Design partner',
        },
      })
    );
  });

  it('maps invalid_reason and plan_not_allowed invite errors', async () => {
    mockInvite.mockResolvedValueOnce({ error: 'invalid_reason' });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reason when granting vip access/i
    );

    mockInvite.mockResolvedValueOnce({ error: 'plan_not_allowed' });
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not allowed for waitlist invites/i
    );
  });

  it('shows email_not_configured message when invite email cannot be sent', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { error: 'email_not_configured' },
      error: null,
    });
    const user = userEvent.setup();
    render(<AdminInviteByEmailPanel />);
    await user.type(
      screen.getByLabelText(/email address/i),
      'invitee@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email delivery is not configured/i
    );
  });
});
