import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import * as statsModule from '../hooks/useAdminOverviewStats';

vi.mock('../hooks/useAdminOverviewStats');
const mockUseStats = vi.mocked(statsModule.useAdminOverviewStats);

const meSettings = {
  product_id: 'test-product',
  enabled: true,
  provider: 'kit' as const,
  config: { namespace: 'ns', kitFormId: 'form-1', tierTagNames: [] },
};

const defaultStats = {
  usersTotal: 5,
  waitlistPending: 2,
  signupMode: 'open' as const,
  marketingEmail: null,
  loading: false,
  error: null,
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    mockUseStats.mockReturnValue(defaultStats);
  });

  it('renders overview heading and all four card links', () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/admin/users');
    expect(hrefs).toContain('/admin/waitlist');
    expect(hrefs).toContain('/admin/waitlist/settings');
    expect(hrefs).toContain('/admin/marketing-email/settings');
  });

  it('displays live stats from the hook', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      usersTotal: 42,
      waitlistPending: 7,
      signupMode: 'invite_only',
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('42 total users')).toBeInTheDocument();
    expect(screen.getByText('7 pending')).toBeInTheDocument();
    expect(screen.getByText('Invite only')).toBeInTheDocument();
  });

  it('shows em-dash for stats while loading', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      usersTotal: null,
      waitlistPending: null,
      signupMode: null,
      loading: true,
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('— total users')).toBeInTheDocument();
    expect(screen.getByText('— pending')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('shows "…" placeholder for marketing email while loading', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: null,
      loading: true,
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('shows "Not configured" when settings is null', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: { settings: null, stats: null },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('shows "Enabled" with no backlog', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: meSettings,
        stats: { pending: 0, processing: 0, done: 10, failed: 0 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows "Disabled" with no backlog', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: { ...meSettings, enabled: false },
        stats: { pending: 0, processing: 0, done: 0, failed: 0 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('appends pending and failed counts when non-zero', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: meSettings,
        stats: { pending: 3, processing: 0, done: 10, failed: 2 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Enabled · 3 pending · 2 failed')).toBeInTheDocument();
  });

  it('shows "Disabled · 12 pending · 2 failed" when disabled with backlog', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: { ...meSettings, enabled: false },
        stats: { pending: 12, processing: 0, done: 0, failed: 2 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Disabled · 12 pending · 2 failed')).toBeInTheDocument();
  });

  it('applies red styling when there are failures', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: meSettings,
        stats: { pending: 0, processing: 0, done: 10, failed: 2 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    const subtitle = screen.getByText('Enabled · 2 failed');
    expect(subtitle).toHaveClass('text-red-600');
  });

  it('uses gray styling when there are no failures', () => {
    mockUseStats.mockReturnValue({
      ...defaultStats,
      marketingEmail: {
        settings: meSettings,
        stats: { pending: 3, processing: 0, done: 10, failed: 0 },
      },
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    const subtitle = screen.getByText('Enabled · 3 pending');
    expect(subtitle).toHaveClass('text-gray-500');
  });
});
