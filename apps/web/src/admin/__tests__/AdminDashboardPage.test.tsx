import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import * as statsModule from '../hooks/useAdminOverviewStats';

vi.mock('../hooks/useAdminOverviewStats');
const mockUseStats = vi.mocked(statsModule.useAdminOverviewStats);

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    mockUseStats.mockReturnValue({
      usersTotal: 5,
      waitlistPending: 2,
      signupMode: 'open',
      loading: false,
      error: null,
    });
  });

  it('renders overview heading and all three card links', () => {
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
  });

  it('displays live stats from the hook', () => {
    mockUseStats.mockReturnValue({
      usersTotal: 42,
      waitlistPending: 7,
      signupMode: 'invite_only',
      loading: false,
      error: null,
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
      usersTotal: null,
      waitlistPending: null,
      signupMode: null,
      loading: true,
      error: null,
    });
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('\u2014 total users')).toBeInTheDocument();
    expect(screen.getByText('\u2014 pending')).toBeInTheDocument();
    expect(screen.getAllByText('\u2014')).toHaveLength(1);
  });
});
