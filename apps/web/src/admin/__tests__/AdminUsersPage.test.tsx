import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminUsersPage from '../pages/AdminUsersPage';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'current-user-id' } },
      }),
    },
  },
}));

const mockUseAdminUsers = vi.hoisted(() => ({
  search: '',
  setSearch: vi.fn(),
  sort: 'signup' as const,
  sortDir: 'desc' as const,
  toggleSort: vi.fn(),
  offset: 0,
  setOffset: vi.fn(),
  pageSize: 25,
  data: {
    users: [
      {
        user_id: 'u1',
        email: 'user@example.com',
        display_name: 'User One',
        username: null,
        signup_at: '2024-06-01T00:00:00Z',
        last_active_at: '2024-06-02T00:00:00Z',
        plan_id: 'beakerstack_pro',
        subscription_status: 'active',
        plan_display_name: 'Pro',
        is_admin: false,
        usage_current_period: { ai_summarize: 5 },
      },
    ],
    total: 1,
    limit: 25,
    offset: 0,
  },
  loading: false,
  error: null as Error | null,
  reload: vi.fn(),
}));

vi.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: () => mockUseAdminUsers,
}));

vi.mock('../components/AdminUserDetailDrawer.web', () => ({
  AdminUserDetailDrawer: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div data-testid='detail-drawer'>{title}</div> : null,
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminUsers.loading = false;
    mockUseAdminUsers.error = null;
    mockUseAdminUsers.data = {
      users: [
        {
          user_id: 'u1',
          email: 'user@example.com',
          display_name: 'User One',
          username: null,
          signup_at: '2024-06-01T00:00:00Z',
          last_active_at: '2024-06-02T00:00:00Z',
          plan_id: 'beakerstack_pro',
          subscription_status: 'active',
          plan_display_name: 'Pro',
          is_admin: false,
          usage_current_period: { ai_summarize: 5 },
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };
  });

  it('renders user table row', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show admin badge for non-admin user', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await screen.findByText('user@example.com');
    expect(screen.queryByTestId('admin-badge')).not.toBeInTheDocument();
  });

  it('shows admin badge for admin user', async () => {
    mockUseAdminUsers.data = {
      ...mockUseAdminUsers.data,
      users: [{ ...mockUseAdminUsers.data.users[0]!, is_admin: true }],
    };
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('admin-badge')).toBeInTheDocument();
  });

  it('shows error message when hook reports error', () => {
    mockUseAdminUsers.error = new Error('load failed');
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('load failed');
  });

  it('opens detail drawer on row click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('user@example.com'));
    expect(screen.getByTestId('detail-drawer')).toHaveTextContent(
      'user@example.com'
    );
  });

  it('calls toggleSort when signup header clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /signup/i }));
    expect(mockUseAdminUsers.toggleSort).toHaveBeenCalledWith('signup');
  });
});

