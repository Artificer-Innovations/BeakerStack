import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminWaitlistPage from '../pages/AdminWaitlistPage';

const mockHook = vi.hoisted(() => ({
  search: '',
  setSearch: vi.fn(),
  status: '',
  setStatus: vi.fn(),
  offset: 0,
  setOffset: vi.fn(),
  pageSize: 25,
  data: {
    entries: [
      {
        id: 'e1',
        email: 'wait@example.com',
        status: 'pending' as const,
        metadata: {},
        submitted_at: 'not-a-date',
        approved_at: null,
        rejected_at: null,
        converted_at: null,
        converted_user_id: null,
        has_active_invite: false,
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

vi.mock('../hooks/useAdminWaitlist', () => ({
  useAdminWaitlist: () => mockHook,
}));

vi.mock('../components/AdminInviteByEmailPanel.web', () => ({
  AdminInviteByEmailPanel: ({ onInvited }: { onInvited?: () => void }) => (
    <div data-testid='invite-by-email'>
      <button type='button' onClick={onInvited}>
        Trigger invite reload
      </button>
    </div>
  ),
}));

vi.mock('../components/AdminWaitlistDetailDrawer.web', () => ({
  AdminWaitlistDetailDrawer: ({
    open,
    entry,
    onClose,
    onUpdated,
  }: {
    open: boolean;
    entry: { email: string } | null;
    onClose: () => void;
    onUpdated: () => void;
  }) =>
    open && entry ? (
      <div data-testid='waitlist-drawer'>
        {entry.email}
        <button type='button' onClick={onUpdated}>
          Refresh entry
        </button>
        <button type='button' onClick={onClose}>
          Close drawer
        </button>
      </div>
    ) : null,
}));

describe('AdminWaitlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook.loading = false;
    mockHook.error = null;
    mockHook.data = {
      entries: [
        {
          id: 'e1',
          email: 'wait@example.com',
          status: 'pending',
          metadata: {},
          submitted_at: 'not-a-date',
          approved_at: null,
          rejected_at: null,
          converted_at: null,
          converted_user_id: null,
          has_active_invite: false,
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };
  });

  it('renders invite-by-email panel', () => {
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('invite-by-email')).toBeInTheDocument();
  });

  it('reloads list when invite panel reports success', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    await user.click(
      screen.getByRole('button', { name: /trigger invite reload/i })
    );
    expect(mockHook.reload).toHaveBeenCalled();
  });

  it('renders waitlist table row', async () => {
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('wait@example.com')).toBeInTheDocument();
    expect(screen.getByText('Invalid Date')).toBeInTheDocument();
  });

  it('shows error message when hook reports error', () => {
    mockHook.error = new Error('load failed');
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('load failed');
  });

  it('opens detail drawer on row click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('wait@example.com'));
    expect(screen.getByTestId('waitlist-drawer')).toHaveTextContent(
      'wait@example.com'
    );
  });

  it('reloads when drawer reports an update', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('wait@example.com'));
    await user.click(screen.getByRole('button', { name: /refresh entry/i }));
    expect(mockHook.reload).toHaveBeenCalled();
  });

  it('calls setStatus when filter changes', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    await user.selectOptions(screen.getByRole('combobox'), 'approved');
    expect(mockHook.setStatus).toHaveBeenCalledWith('approved');
  });

  it('forwards typed search to the hook via onChange', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/search by email/i);
    await user.type(input, 'b');
    expect(mockHook.setSearch).toHaveBeenCalled();
  });

  it('closes drawer when onClose fires', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('wait@example.com'));
    expect(screen.getByTestId('waitlist-drawer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close drawer/i }));
    expect(screen.queryByTestId('waitlist-drawer')).not.toBeInTheDocument();
  });

  it('renders without pagination when hook data is null', () => {
    mockHook.data = null as unknown as typeof mockHook.data;
    render(
      <MemoryRouter>
        <AdminWaitlistPage />
      </MemoryRouter>
    );
    // No row to click → still renders header
    expect(
      screen.getByRole('heading', { name: /waitlist/i })
    ).toBeInTheDocument();
  });

  it('falls back to original date string when formatDate throws', () => {
    const original = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function () {
      throw new Error('bad date');
    };
    try {
      render(
        <MemoryRouter>
          <AdminWaitlistPage />
        </MemoryRouter>
      );
      expect(screen.getByText('not-a-date')).toBeInTheDocument();
    } finally {
      Date.prototype.toLocaleDateString = original;
    }
  });
});
