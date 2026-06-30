import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  approveWaitlistEntry,
  emitLifecycleEvent,
  rejectWaitlistEntry,
  resendWaitlistInvite,
} from '@beakerstack/waitlist';
import { AdminWaitlistDetailDrawer } from '../components/AdminWaitlistDetailDrawer.web';

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    approveWaitlistEntry: vi.fn(),
    rejectWaitlistEntry: vi.fn(),
    resendWaitlistInvite: vi.fn(),
    emitLifecycleEvent: vi.fn(),
  };
});

const mockSetProvisioningIntent = vi.fn();

vi.mock('@beakerstack/waitlist-billing/web', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@beakerstack/waitlist-billing/web')>();
  return {
    ...actual,
    setWaitlistEntryProvisioningIntent: (...args: unknown[]) =>
      mockSetProvisioningIntent(...args),
  };
});

const mockApprove = vi.mocked(approveWaitlistEntry);
const mockReject = vi.mocked(rejectWaitlistEntry);
const mockResend = vi.mocked(resendWaitlistInvite);
const mockEmit = vi.mocked(emitLifecycleEvent);

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const pendingEntry = {
  id: 'e1',
  email: 'wait@example.com',
  status: 'pending' as const,
  metadata: { note: 'hi' },
  submitted_at: '2024-01-01T00:00:00Z',
  approved_at: null,
  rejected_at: null,
  converted_at: null,
  converted_user_id: null,
  has_active_invite: false,
};

describe('AdminWaitlistDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock.mockResolvedValue({ data: {}, error: null });
    mockSetProvisioningIntent.mockResolvedValue({ ok: true });
    mockApprove.mockResolvedValue({
      invite_token: 'tok',
      email: 'wait@example.com',
    });
    mockReject.mockResolvedValue({});
    mockResend.mockResolvedValue({
      invite_token: 'tok2',
      email: 'wait@example.com',
    });
  });

  it('returns null when entry is missing', () => {
    const { container } = render(
      <AdminWaitlistDetailDrawer
        entry={null}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('approves pending entry and shows invite link', async () => {
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalled();
      expect(screen.getByText(/signup\/invite#token=tok/)).toBeInTheDocument();
    });
    expect(mockEmit).toHaveBeenCalledWith(
      'waitlist.approved',
      expect.objectContaining({ email: 'wait@example.com' })
    );
  });

  it('rejects pending entry', async () => {
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    );

    await user.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        'waitlist.rejected',
        expect.objectContaining({ email: 'wait@example.com' })
      );
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('resends invite for approved entry', async () => {
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={{ ...pendingEntry, status: 'approved' }}
        open
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    );

    await user.click(screen.getByRole('button', { name: /resend invite/i }));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('shows approve error from RPC', async () => {
    mockApprove.mockResolvedValueOnce({ error: 'denied' });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('denied');
    });
  });

  it('surfaces email_not_configured from send_invite_email', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { error: 'email_not_configured' },
      error: null,
    });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /email delivery is not configured/i
      );
    });
  });

  it('surfaces send_invite_email errors from the ops function', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { error: 'email_send_failed' },
      error: null,
    });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('email_send_failed');
    });
  });

  it('approves without sending when approve returns no invite token', async () => {
    mockApprove.mockResolvedValueOnce({ email: 'wait@example.com' });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalled();
    });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('omits metadata block when metadata is empty', () => {
    render(
      <AdminWaitlistDetailDrawer
        entry={{ ...pendingEntry, metadata: {} }}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    expect(screen.queryByText(/"note"/)).not.toBeInTheDocument();
  });

  it('falls back when date formatting throws', () => {
    const toLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = vi.fn(() => {
      throw new Error('bad date');
    });
    try {
      render(
        <AdminWaitlistDetailDrawer
          entry={{ ...pendingEntry, submitted_at: '2024-01-01T00:00:00Z' }}
          open
          onClose={vi.fn()}
          onUpdated={vi.fn()}
        />
      );
      expect(screen.getByText('2024-01-01T00:00:00Z')).toBeInTheDocument();
    } finally {
      Date.prototype.toLocaleString = toLocaleString;
    }
  });

  it('surfaces resend failures', async () => {
    mockResend.mockRejectedValueOnce(new Error('resend failed'));
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={{ ...pendingEntry, status: 'approved' }}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /resend invite/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('resend failed');
    });
  });

  it('surfaces reject failures', async () => {
    mockReject.mockRejectedValueOnce(new Error('reject failed'));
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('reject failed');
    });
  });

  it('surfaces RPC errors from rejectWaitlistEntry', async () => {
    mockReject.mockResolvedValueOnce({ error: 'denied' });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('denied');
    });
  });

  it('surfaces RPC errors from resendWaitlistInvite', async () => {
    mockResend.mockResolvedValueOnce({ error: 'denied' });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={{ ...pendingEntry, status: 'approved' }}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /resend invite/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('denied');
    });
  });

  it('surfaces invoke fnErr from send_invite_email', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'invoke failed' },
    });
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('invoke failed');
    });
  });

  it('uses generic copy when approve throws a non-Error value', async () => {
    mockApprove.mockRejectedValueOnce('boom');
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/approve failed/i);
    });
  });

  it('uses generic copy when reject throws a non-Error value', async () => {
    mockReject.mockRejectedValueOnce('boom');
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/reject failed/i);
    });
  });

  it('uses generic copy when resend throws a non-Error value', async () => {
    mockResend.mockRejectedValueOnce('boom');
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={{ ...pendingEntry, status: 'approved' }}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /resend invite/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/resend failed/i);
    });
  });

  it('copies invite link via clipboard when Copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /approve/i }));
    const copy = await screen.findByRole('button', {
      name: /copy invite link/i,
    });
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/signup/invite#token=tok')
    );
  });

  it('approves with VIP provisioning intent when enabled', async () => {
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: /grant complimentary vip on signup/i,
      })
    );
    await user.type(
      screen.getByLabelText(/^reason \(required\)$/i),
      'Founder friend'
    );
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(mockApprove).toHaveBeenCalled());
    expect(mockApprove).toHaveBeenCalledWith(
      expect.anything(),
      'e1',
      expect.objectContaining({
        provisioningIntent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'Founder friend',
        },
      })
    );
  });

  it('requires VIP reason before approving pending entry', async () => {
    const user = userEvent.setup();
    render(
      <AdminWaitlistDetailDrawer
        entry={pendingEntry}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: /grant complimentary vip on signup/i,
      })
    );
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reason when granting vip access/i
    );
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('saves VIP provisioning intent on approved entries', async () => {
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    const approvedEntry = {
      ...pendingEntry,
      status: 'approved' as const,
      approved_at: '2024-01-02T00:00:00Z',
      has_active_invite: true,
    };
    render(
      <AdminWaitlistDetailDrawer
        entry={approvedEntry}
        open
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: /grant complimentary vip on signup/i,
      })
    );
    await user.type(
      screen.getByLabelText(/^reason \(required\)$/i),
      'Retroactive VIP'
    );
    await user.click(screen.getByRole('button', { name: /save vip intent/i }));
    await waitFor(() => expect(mockSetProvisioningIntent).toHaveBeenCalled());
    expect(onUpdated).toHaveBeenCalled();
  });
});
