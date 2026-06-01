import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectionsAccept,
  connectionsDisconnect,
  connectionsUnblock,
} from '@beakerstack/connections';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ConnectionsPage from '../ConnectionsPage';

const mockRefresh = vi.fn();
const mockUseConnections = vi.fn();

vi.mock('@beakerstack/connections/web', () => ({
  ConnectionSearchPanel: () => (
    <div data-testid='connection-search-panel'>search</div>
  ),
  ConnectionUserRow: ({
    displayName,
    subtitle,
    actions,
  }: {
    displayName: string | null;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div data-testid='connection-user-row'>
      <span>{displayName}</span>
      {subtitle ? <span>{subtitle}</span> : null}
      {actions}
    </div>
  ),
}));

vi.mock('@beakerstack/connections', () => ({
  useConnections: () => mockUseConnections(),
  connectionsAccept: vi.fn(),
  connectionsDecline: vi.fn(),
  connectionsDisconnect: vi.fn(),
  connectionsUnblock: vi.fn(),
  mapUnknownError: (e: unknown) => ({
    message: e instanceof Error ? e.message : 'error',
  }),
}));

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1', email: 'me@example.com' },
    loading: false,
  }),
}));

vi.mock('@beakerstack/shared/config/adopterRuntime', () => ({
  getAdopterConfig: () => ({
    branding: { displayName: 'Beaker Stack' },
  }),
}));

vi.mock('@/components/AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => <header data-testid='app-header'>Header</header>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConnections.mockReturnValue({
      rows: [],
      loading: false,
      refresh: mockRefresh,
    });
  });

  it('renders search and empty connection sections', () => {
    render(
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Connections' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('connection-search-panel')).toBeInTheDocument();
    expect(screen.getByText('No pending requests.')).toBeInTheDocument();
    expect(screen.getByText('No connections yet.')).toBeInTheDocument();
  });

  it('accepts an incoming request', async () => {
    mockUseConnections.mockReturnValue({
      rows: [
        {
          id: 'conn-1',
          recipient_user_id: 'user-1',
          initiator_user_id: 'user-2',
          effective_status: 'pending',
          is_initiator: false,
          status: 'pending',
          username: 'jane',
          display_name: 'Jane',
          avatar_url: null,
        },
      ],
      loading: false,
      refresh: mockRefresh,
    });
    vi.mocked(connectionsAccept).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => {
      expect(connectionsAccept).toHaveBeenCalledWith({}, 'conn-1');
    });
  });

  it('disconnects after confirmation', async () => {
    mockUseConnections.mockReturnValue({
      rows: [
        {
          id: 'conn-2',
          recipient_user_id: 'user-2',
          initiator_user_id: 'user-1',
          effective_status: 'accepted',
          is_initiator: true,
          status: 'accepted',
          username: 'alex',
          display_name: 'Alex',
          avatar_url: null,
        },
      ],
      loading: false,
      refresh: mockRefresh,
    });
    vi.mocked(connectionsDisconnect).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Disconnect' })
    );

    await waitFor(() => {
      expect(connectionsDisconnect).toHaveBeenCalledWith({}, 'conn-2');
    });
  });

  it('unblocks a user', async () => {
    mockUseConnections.mockReturnValue({
      rows: [
        {
          id: 'conn-3',
          recipient_user_id: 'user-3',
          initiator_user_id: 'user-1',
          effective_status: 'blocked',
          is_initiator: true,
          status: 'blocked',
          username: 'blocked',
          display_name: 'Blocked User',
          avatar_url: null,
        },
      ],
      loading: false,
      refresh: mockRefresh,
    });
    vi.mocked(connectionsUnblock).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Unblock' }));
    await waitFor(() => {
      expect(connectionsUnblock).toHaveBeenCalledWith({}, 'user-3');
    });
  });
});
