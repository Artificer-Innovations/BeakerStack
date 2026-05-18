import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('../components/AdminWaitlistDetailDrawer.web', () => ({
  AdminWaitlistDetailDrawer: ({
    open,
    entry,
    onUpdated,
  }: {
    open: boolean;
    entry: { email: string } | null;
    onUpdated: () => void;
  }) =>
    open && entry ? (
      <div data-testid='waitlist-drawer'>
        {entry.email}
        <button type='button' onClick={onUpdated}>
          Refresh entry
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
});
