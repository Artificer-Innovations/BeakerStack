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
});
