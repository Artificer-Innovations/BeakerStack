import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminUsersPage from '../pages/AdminUsersPage';

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
  usage_current_period: Record<string, number> | null;
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
      data: MockAdminUsersData;
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

  it('calls toggleSort when last_active header clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /last active/i }));
    expect(mockUseAdminUsers.toggleSort).toHaveBeenCalledWith('last_active');
  });

  it('marks signup column ascending and shows ↑ when sort is asc', () => {
    mockUseAdminUsers.sortDir = 'asc';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /signup ↑/i });
    const cell = button.closest('[aria-sort]');
    expect(cell).toHaveAttribute('aria-sort', 'ascending');
  });

  it('marks last_active column descending when sort = last_active and dir = desc', () => {
    mockUseAdminUsers.sort = 'last_active';
    mockUseAdminUsers.sortDir = 'desc';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /last active ↓/i });
    const cell = button.closest('[aria-sort]');
    expect(cell).toHaveAttribute('aria-sort', 'descending');
  });

  it('marks last_active column ascending when sort = last_active and dir = asc', () => {
    mockUseAdminUsers.sort = 'last_active';
    mockUseAdminUsers.sortDir = 'asc';
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /last active ↑/i });
    const cell = button.closest('[aria-sort]');
    expect(cell).toHaveAttribute('aria-sort', 'ascending');
  });

  it('forwards typed search to the hook via onChange', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'a');
    expect(mockUseAdminUsers.setSearch).toHaveBeenCalled();
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

  it('renders em-dash fallbacks for missing user fields', () => {
    mockUseAdminUsers.data = {
      users: [
        {
          user_id: 'u2',
          email: null,
          display_name: null,
          username: null,
          signup_at: null,
          last_active_at: null,
          plan_id: null,
          subscription_status: 'active',
          plan_display_name: null,
          usage_current_period: null,
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
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
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
          plan_display_name: null,
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
          usage_current_period: {},
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
});
