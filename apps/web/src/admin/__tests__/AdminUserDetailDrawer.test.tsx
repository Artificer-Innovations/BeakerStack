import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getUser, grantOperator, revokeOperator } from '@beakerstack/admin';
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer.web';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return {
    ...actual,
    getUser: vi.fn(),
    grantOperator: vi.fn(),
    revokeOperator: vi.fn(),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));

const mockGetUser = vi.mocked(getUser);
const mockGrantOperator = vi.mocked(grantOperator);
const mockRevokeOperator = vi.mocked(revokeOperator);

const sampleDetail = {
  auth: {
    id: 'u1',
    email: 'user@example.com',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-06-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
  },
  profile: { display_name: 'User', username: 'user1' },
  subscription: { plan_id: 'beakerstack_pro', status: 'active' },
  plan: { display_name: 'Pro' },
  admin: {
    is_admin: false,
    granted_at: null,
    granted_by_email: null,
  },
  usage_aggregates: [{ event_type: 'ai_summarize', count: 3 }],
  usage_events: [
    {
      event_type: 'ai_summarize',
      quantity: 1,
      created_at: '2024-06-01T12:00:00Z',
    },
  ],
  invoices: [
    {
      id: 'inv1',
      stripe_invoice_id: 'in_1',
      created_at: '2024-05-01T00:00:00Z',
    },
  ],
};

const adminDetail = {
  ...sampleDetail,
  admin: {
    is_admin: true,
    granted_at: '2024-03-01T00:00:00Z',
    granted_by_email: 'owner@example.com',
  },
};

describe('AdminUserDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(sampleDetail);
    mockGrantOperator.mockResolvedValue(undefined);
    mockRevokeOperator.mockResolvedValue(undefined);
  });

  it('loads and displays user detail when open', async () => {
    render(
      <AdminUserDetailDrawer
        open
        userId='u1'
        title='user@example.com'
        onClose={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    );
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Current period usage' })
    ).toBeInTheDocument();
  });

  it('shows error when getUser fails', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('denied'));
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('denied')
    );
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={onClose} />
    );
    await user.click(screen.getByTestId('admin-drawer-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <AdminUserDetailDrawer
        open={false}
        userId='u1'
        title='User'
        onClose={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ── Operator access section ────────────────────────────────────────────────

  it('shows No admin access and grant button for non-admin user', async () => {
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    expect(
      screen.getByRole('button', { name: /grant admin access/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /revoke admin access/i })
    ).not.toBeInTheDocument();
  });

  it('shows admin badge and revoke button for admin user', async () => {
    mockGetUser.mockResolvedValue(adminDetail);
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Admin');
    expect(screen.getByText('owner@example.com', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /revoke admin access/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /grant admin access/i })
    ).not.toBeInTheDocument();
  });

  it('revoke button is disabled when viewing own user', async () => {
    mockGetUser.mockResolvedValue(adminDetail);
    render(
      <AdminUserDetailDrawer
        open
        userId='u1'
        title='User'
        onClose={vi.fn()}
        currentUserId='u1'
      />
    );
    await screen.findByText('Admin');
    const revokeBtn = screen.getByRole('button', {
      name: /revoke admin access/i,
    });
    expect(revokeBtn).toBeDisabled();
    expect(revokeBtn).toHaveAttribute(
      'title',
      "You can't revoke your own admin access"
    );
  });

  it('grant button opens confirm dialog', async () => {
    const user = userEvent.setup();
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(screen.getByRole('button', { name: /grant admin access/i }));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText(/grant admin access to user@example.com/i)).toBeInTheDocument();
  });

  it('confirm grant calls grantOperator and refreshes detail', async () => {
    const user = userEvent.setup();
    const onAccessChanged = vi.fn();
    mockGetUser
      .mockResolvedValueOnce(sampleDetail)
      .mockResolvedValueOnce(adminDetail);

    render(
      <AdminUserDetailDrawer
        open
        userId='u1'
        title='User'
        onClose={vi.fn()}
        onAccessChanged={onAccessChanged}
      />
    );
    await screen.findByText('No admin access');
    await user.click(screen.getByRole('button', { name: /grant admin access/i }));
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() =>
      expect(mockGrantOperator).toHaveBeenCalledWith(expect.anything(), 'u1')
    );
    expect(onAccessChanged).toHaveBeenCalled();
  });

  it('revoke button opens confirm dialog', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue(adminDetail);
    render(
      <AdminUserDetailDrawer
        open
        userId='u1'
        title='User'
        onClose={vi.fn()}
        currentUserId='other-user'
      />
    );
    await screen.findByText('Admin');
    await user.click(
      screen.getByRole('button', { name: /revoke admin access/i })
    );
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/revoke admin access from user@example.com/i)
    ).toBeInTheDocument();
  });

  it('cancel dismisses confirm dialog without calling rpc', async () => {
    const user = userEvent.setup();
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(screen.getByRole('button', { name: /grant admin access/i }));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(mockGrantOperator).not.toHaveBeenCalled();
  });
});
