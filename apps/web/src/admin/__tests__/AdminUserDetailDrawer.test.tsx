import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getUser,
  grantOperator,
  revokeOperator,
  grantBillingComp,
  revokeBillingComp,
} from '@beakerstack/admin';
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer.web';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return {
    ...actual,
    getUser: vi.fn(),
    grantOperator: vi.fn(),
    revokeOperator: vi.fn(),
    grantBillingComp: vi.fn(),
    revokeBillingComp: vi.fn(),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));

const mockGetUser = vi.mocked(getUser);
const mockGrantOperator = vi.mocked(grantOperator);
const mockRevokeOperator = vi.mocked(revokeOperator);
const mockGrantBillingComp = vi.mocked(grantBillingComp);
const mockRevokeBillingComp = vi.mocked(revokeBillingComp);

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
    mockGrantBillingComp.mockResolvedValue(undefined);
    mockRevokeBillingComp.mockResolvedValue(undefined);
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
    expect(
      screen.getByText('owner@example.com', { exact: false })
    ).toBeInTheDocument();
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
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/grant admin access to user@example.com/i)
    ).toBeInTheDocument();
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
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );
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
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(mockGrantOperator).not.toHaveBeenCalled();
  });

  it('confirm revoke calls revokeOperator and refreshes detail', async () => {
    const user = userEvent.setup();
    const onAccessChanged = vi.fn();
    mockGetUser
      .mockResolvedValueOnce(adminDetail)
      .mockResolvedValueOnce(sampleDetail);

    render(
      <AdminUserDetailDrawer
        open
        userId='u1'
        title='User'
        onClose={vi.fn()}
        currentUserId='other-user'
        onAccessChanged={onAccessChanged}
      />
    );
    await screen.findByText('Admin');
    await user.click(
      screen.getByRole('button', { name: /revoke admin access/i })
    );
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() =>
      expect(mockRevokeOperator).toHaveBeenCalledWith(expect.anything(), 'u1')
    );
    expect(onAccessChanged).toHaveBeenCalled();
  });

  it('shows friendly message when revoke returns cannot_self_revoke', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue(adminDetail);
    mockRevokeOperator.mockRejectedValueOnce(new Error('cannot_self_revoke'));

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
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    expect(
      await screen.findByText("You can't revoke your own admin access")
    ).toBeInTheDocument();
  });

  it('shows generic action error for non-Error rejections', async () => {
    const user = userEvent.setup();
    mockGrantOperator.mockRejectedValueOnce('nope');

    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    expect(await screen.findByText('Action failed')).toBeInTheDocument();
  });

  it('shows non-Error load failure message', async () => {
    mockGetUser.mockRejectedValueOnce('denied');
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load user')
    );
  });

  it('revoke button stays disabled while currentUserId is unknown', async () => {
    mockGetUser.mockResolvedValue(adminDetail);
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Admin');
    expect(
      screen.getByRole('button', { name: /revoke admin access/i })
    ).toBeDisabled();
  });

  it('confirm dialog uses fallback label when email is missing', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      auth: { ...sampleDetail.auth, email: null },
    });

    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );

    expect(
      screen.getByText(/grant admin access to this user/i)
    ).toBeInTheDocument();
  });

  it('omits profile section when profile is null', async () => {
    mockGetUser.mockResolvedValue({ ...sampleDetail, profile: null });
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Pro');
    expect(screen.queryByText('Display name')).not.toBeInTheDocument();
  });

  it('shows billing fallbacks and usage metadata defaults', async () => {
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      profile: null,
      plan: null,
      subscription: { plan_id: 'beakerstack_free', status: null },
      usage_aggregates: [{ event_type: null, count: null }],
      usage_events: [
        { event_type: 'ai_summarize', quantity: null, created_at: null },
      ],
      invoices: [{ id: 'inv2', created_at: null }],
    });

    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('beakerstack_free');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('×1')).toBeInTheDocument();
  });

  it('shows admin metadata without granter when not recorded', async () => {
    mockGetUser.mockResolvedValue({
      ...adminDetail,
      admin: {
        is_admin: true,
        granted_at: null,
        granted_by_email: null,
      },
    });

    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Admin');
    expect(screen.queryByText(/granted by/i)).not.toBeInTheDocument();
  });

  it('ignores refresh errors after a successful grant', async () => {
    const user = userEvent.setup();
    mockGetUser
      .mockResolvedValueOnce(sampleDetail)
      .mockRejectedValueOnce(new Error('refresh failed'));

    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant admin access/i })
    );
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(mockGrantOperator).toHaveBeenCalled());
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('falls back to raw date string when formatDate throws', async () => {
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      auth: { ...sampleDetail.auth, created_at: 'bad-date' },
    });
    const original = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function () {
      throw new Error('bad date');
    };
    try {
      render(
        <AdminUserDetailDrawer
          open
          userId='u1'
          title='User'
          onClose={vi.fn()}
        />
      );
      expect(await screen.findByText('bad-date')).toBeInTheDocument();
    } finally {
      Date.prototype.toLocaleString = original;
    }
  });

  it('revoke confirm uses fallback label when email is missing', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({
      ...adminDetail,
      auth: { ...adminDetail.auth, email: null },
    });

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
    expect(
      screen.getByText(/revoke admin access from this user/i)
    ).toBeInTheDocument();
  });

  it('shows profile field fallbacks when values are missing', async () => {
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      profile: { display_name: null, username: null },
    });
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Profile');
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('grants complimentary VIP with a required reason', async () => {
    const user = userEvent.setup();
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant complimentary vip/i })
    );
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeDisabled();
    await user.type(screen.getByTestId('comp-grant-reason'), 'Design partner');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() =>
      expect(mockGrantBillingComp).toHaveBeenCalledWith(expect.anything(), {
        userId: 'u1',
        productId: 'beakerstack',
        planId: 'beakerstack_vip',
        reason: 'Design partner',
      })
    );
  });

  it('shows comp grant metadata and revokes complimentary access', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      subscription: { plan_id: 'beakerstack_vip', status: 'comped' },
      comp_grant: {
        id: 'cg1',
        plan_id: 'beakerstack_vip',
        comped_by: 'admin1',
        comp_reason: 'Press access',
        comped_by_email: 'admin@example.com',
        comped_at: '2024-06-01T00:00:00Z',
        comp_expires_at: '2025-06-01T00:00:00Z',
      },
    });
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Complimentary access');
    expect(screen.getByText('Press access')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /revoke complimentary access/i })
    );
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() =>
      expect(mockRevokeBillingComp).toHaveBeenCalledWith(
        expect.anything(),
        'u1',
        'beakerstack'
      )
    );
  });

  it('shows comp grant metadata without granter email', async () => {
    mockGetUser.mockResolvedValue({
      ...sampleDetail,
      subscription: { plan_id: 'beakerstack_vip', status: 'comped' },
      comp_grant: {
        id: 'cg2',
        plan_id: 'beakerstack_vip',
        comped_by: 'admin1',
        comp_reason: 'Beta tester',
        comped_by_email: null,
        comped_at: '2024-06-01T00:00:00Z',
        comp_expires_at: null,
      },
    });
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('Beta tester');
    expect(screen.queryByText(/granted by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/expires/i)).not.toBeInTheDocument();
  });

  it('shows friendly comp grant error for stripe_subscription_active', async () => {
    const user = userEvent.setup();
    mockGrantBillingComp.mockRejectedValueOnce(
      new Error('stripe_subscription_active')
    );
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant complimentary vip/i })
    );
    await user.type(screen.getByTestId('comp-grant-reason'), 'Should fail');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(
      await screen.findByText(/active Stripe subscription/i)
    ).toBeInTheDocument();
  });

  it('maps invalid_reason comp grant errors', async () => {
    const user = userEvent.setup();
    mockGrantBillingComp.mockRejectedValueOnce(new Error('invalid_reason'));
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant complimentary vip/i })
    );
    await user.type(screen.getByTestId('comp-grant-reason'), 'Test reason');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(await screen.findByText(/reason is required/i)).toBeInTheDocument();
  });

  it('maps invalid_plan comp grant errors', async () => {
    const user = userEvent.setup();
    mockGrantBillingComp.mockRejectedValueOnce(new Error('invalid_plan'));
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant complimentary vip/i })
    );
    await user.type(screen.getByTestId('comp-grant-reason'), 'Test reason');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(
      await screen.findByText(/invalid complimentary plan/i)
    ).toBeInTheDocument();
  });

  it('maps no_free_plan comp grant errors', async () => {
    const user = userEvent.setup();
    mockGrantBillingComp.mockRejectedValueOnce(new Error('no_free_plan'));
    render(
      <AdminUserDetailDrawer open userId='u1' title='User' onClose={vi.fn()} />
    );
    await screen.findByText('No admin access');
    await user.click(
      screen.getByRole('button', { name: /grant complimentary vip/i })
    );
    await user.type(screen.getByTestId('comp-grant-reason'), 'Test reason');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(await screen.findByText(/public free plan/i)).toBeInTheDocument();
  });
});
