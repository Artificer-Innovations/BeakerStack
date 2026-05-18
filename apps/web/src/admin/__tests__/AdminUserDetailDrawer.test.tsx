import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getUser } from '@beakerstack/admin';
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer.web';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return { ...actual, getUser: vi.fn() };
});

const mockGetUser = vi.mocked(getUser);

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

describe('AdminUserDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(sampleDetail);
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
    await user.click(screen.getByLabelText('Close panel'));
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
});
