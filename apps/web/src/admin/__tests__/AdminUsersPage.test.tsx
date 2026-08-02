import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminUsersPage from '../pages/AdminUsersPage';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'current-user-id' } },
      }),
    },
  },
}));

const mockGetUser = vi.mocked(supabase.auth.getUser);

interface MockAdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  signup_at: string | null;
  last_active_at: string | null;
  plan_id: string | null;
  subscription_status: string;
  plan_display_name: string | null;
  is_admin: boolean;
  usage_current_period: Record<string, number>;
}

interface MockAdminUsersData {
  users: MockAdminUser[];
  total: number;
  limit: number;
  offset: number;
}

const mockUseAdminUsers = vi.hoisted(
  () =>
    ({
      search: '',
      setSearch: vi.fn(),
      sort: 'signup' as 'signup' | 'last_active',
      sortDir: 'desc' as 'asc' | 'desc',
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
      } as MockAdminUsersData,
      loading: false,
      error: null as Error | null,
      reload: vi.fn(),
    }) as {
      search: string;
      setSearch: ReturnType<typeof vi.fn>;
      sort: 'signup' | 'last_active';
      sortDir: 'asc' | 'desc';
      toggleSort: ReturnType<typeof vi.fn>;
      offset: number;
      setOffset: ReturnType<typeof vi.fn>;
      pageSize: number;
      data: MockAdminUsersData | null;
      loading: boolean;
      error: Error | null;
      reload: ReturnType<typeof vi.fn>;
    }
);

vi.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: () => mockUseAdminUsers,
}));

vi.mock('../components/AdminUserDetailDrawer.web', () => ({
  AdminUserDetailDrawer: ({
    open,
    title,
    onClose,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid='detail-drawer'>
        {title}
        <button type='button' onClick={onClose}>
          Close drawer
        </button>
      </div>
    ) : null,
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminUsers.loading = false;
    mockUseAdminUsers.error = null;
    mockUseAdminUsers.sort = 'signup';
    mockUseAdminUsers.sortDir = 'desc';
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
    const currentData = mockUseAdminUsers.data;
    const baseUser = currentData?.users[0];
    if (!currentData || !baseUser) {
      throw new Error('expected mock user data');
    }
    mockUseAdminUsers.data = {
      ...currentData,
      users: [{ ...baseUser, is_admin: true }],
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

  it('closes the detail drawer when onClose fires', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('user@example.com'));
    expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close drawer/i }));
    expect(screen.queryByTestId('detail-drawer')).not.toBeInTheDocument();
  });

  it('forwards search input to setSearch via onChange', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.type(screen.getByPlaceholderText(/search/i), 'a');
    expect(mockUseAdminUsers.setSearch).toHaveBeenCalled();
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

  it('calls toggleSort when last active header clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /last active/i }));
    expect(mockUseAdminUsers.toggleSort).toHaveBeenCalledWith('last_active');
  });

  it('shows signup sort ascending indicator when sortDir is asc', () => {
    mockUseAdminUsers.sortDir = 'asc';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: /signup ↑/i })
    ).toBeInTheDocument();
  });

  it('shows last active sort indicator when sorted by last_active', () => {
    mockUseAdminUsers.sort = 'last_active';
    mockUseAdminUsers.sortDir = 'asc';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: /last active ↑/i })
    ).toBeInTheDocument();
  });

  it('renders em-dash fallbacks for missing user fields', () => {
    mockUseAdminUsers.data = {
      users: [
        {
          user_id: 'u2',
          email: null,
          display_name: null,
          username: 'handle',
          signup_at: null,
          last_active_at: null,
          plan_id: 'beakerstack_free',
          subscription_status: 'active',
          plan_display_name: null,
          is_admin: false,
          usage_current_period: {},
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(screen.getByText('handle')).toBeInTheDocument();
    expect(screen.getByText('beakerstack_free')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('falls back to display_name when email is null in row label', () => {
    mockUseAdminUsers.data = {
      users: [
        {
          user_id: 'u3',
          email: null,
          display_name: 'Display Only',
          username: null,
          signup_at: '2024-06-01T00:00:00Z',
          last_active_at: null,
          plan_id: 'beakerstack_free',
          subscription_status: 'free',
          plan_display_name: 'Free',
          is_admin: false,
          usage_current_period: { ai_summarize: 0 },
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Display Only')).toBeInTheDocument();
  });

  it('falls back to original date string when formatDate throws', () => {
    mockUseAdminUsers.data = {
      users: [
        {
          user_id: 'u4',
          email: 'bad@example.com',
          display_name: 'B',
          username: null,
          signup_at: 'not-iso',
          last_active_at: null,
          plan_id: 'beakerstack_free',
          subscription_status: 'free',
          plan_display_name: 'Free',
          is_admin: false,
          usage_current_period: { ai_summarize: 0 },
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };
    const original = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function () {
      throw new Error('bad date');
    };
    try {
      render(
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      );
      expect(screen.getByText('not-iso')).toBeInTheDocument();
    } finally {
      Date.prototype.toLocaleDateString = original;
    }
  });

  it('leaves currentUserId null when auth user is missing', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await screen.findByText('user@example.com');
    expect(mockGetUser).toHaveBeenCalled();
  });

  it('renders empty table when hook data is null', () => {
    mockUseAdminUsers.data = null;
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    expect(screen.getByText('No users match your search.')).toBeInTheDocument();
  });

  it('marks last active column unsorted when sorting by signup', () => {
    mockUseAdminUsers.sort = 'signup';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /^last active/i });
    const cell = button.closest('[aria-sort]');
    expect(cell).toHaveAttribute('aria-sort', 'none');
  });

  it('marks signup column unsorted when sorting by last_active', () => {
    mockUseAdminUsers.sort = 'last_active';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /^signup/i });
    const cell = button.closest('[aria-sort]');
    expect(cell).toHaveAttribute('aria-sort', 'none');
  });
});
