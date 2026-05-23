import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayoutShell, breadcrumbsForPath } from '../AdminLayoutShell';

const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({ signOut: mockSignOut }),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderShell(path: string, routePath: string, outlet: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminLayoutShell />}>
          <Route path={routePath} element={outlet} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminLayoutShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nav and outlet for users path', () => {
    renderShell('/users', 'users', <p>Users outlet</p>);
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Users outlet')).toBeInTheDocument();
  });

  it('renders outlet for waitlist path', () => {
    renderShell('/waitlist', 'waitlist', <p>Waitlist outlet</p>);
    expect(screen.getByText('Waitlist outlet')).toBeInTheDocument();
  });

  it('renders outlet for waitlist settings path', () => {
    renderShell(
      '/waitlist/settings',
      'waitlist/settings',
      <p>Settings outlet</p>
    );
    expect(screen.getByText('Settings outlet')).toBeInTheDocument();
  });

  it('renders a Dashboard link pointing to /dashboard', () => {
    renderShell('/admin', 'admin', <p>Admin home</p>);
    const links = screen.getAllByRole('link', { name: /dashboard/i });
    expect(links.some(l => l.getAttribute('href') === '/dashboard')).toBe(true);
  });

  it('calls signOut and navigates to / when Sign out is clicked', async () => {
    const user = userEvent.setup();
    renderShell('/admin', 'admin', <p>Admin home</p>);
    const sidebar = screen.getByRole('complementary');
    const signOutButton = within(sidebar).getByRole('button', {
      name: /sign out/i,
    });
    await user.click(signOutButton);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('breadcrumbs', () => {
    it('Overview \u2192 Users for /users path', () => {
      renderShell('/users', 'users', <p>outlet</p>);
      const bc = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(
        within(bc).getByRole('link', { name: 'Overview' })
      ).toHaveAttribute('href', '/admin');
      expect(within(bc).getByText('Users')).toBeInTheDocument();
    });

    it('Overview \u2192 Waitlist for /waitlist path', () => {
      renderShell('/waitlist', 'waitlist', <p>outlet</p>);
      const bc = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(
        within(bc).getByRole('link', { name: 'Overview' })
      ).toHaveAttribute('href', '/admin');
      expect(within(bc).getByText('Waitlist')).toBeInTheDocument();
    });

    it('Overview \u2192 Waitlist Settings for /waitlist/settings path', () => {
      renderShell('/waitlist/settings', 'waitlist/settings', <p>outlet</p>);
      const bc = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(
        within(bc).getByRole('link', { name: 'Overview' })
      ).toHaveAttribute('href', '/admin');
      expect(within(bc).getByText('Waitlist Settings')).toBeInTheDocument();
    });

    it('Overview \u2192 Marketing Email Settings for /marketing-email/settings path', () => {
      renderShell(
        '/marketing-email/settings',
        'marketing-email/settings',
        <p>outlet</p>
      );
      const bc = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(
        within(bc).getByRole('link', { name: 'Overview' })
      ).toHaveAttribute('href', '/admin');
      expect(
        within(bc).getByText('Marketing Email Settings')
      ).toBeInTheDocument();
    });

    it('single Overview crumb with no link on /admin root', () => {
      renderShell('/admin', 'admin', <p>outlet</p>);
      const bc = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(within(bc).getByText('Overview')).toBeInTheDocument();
      expect(within(bc).queryByRole('link', { name: 'Overview' })).toBeNull();
    });
  });
});

describe('breadcrumbsForPath', () => {
  it('returns Marketing Email breadcrumb for /marketing-email', () => {
    const crumbs = breadcrumbsForPath('/admin/marketing-email');
    expect(crumbs[crumbs.length - 1].label).toBe('Marketing Email');
  });

  it('returns Marketing Email Settings breadcrumb for /marketing-email/settings', () => {
    const crumbs = breadcrumbsForPath('/admin/marketing-email/settings');
    expect(crumbs[crumbs.length - 1].label).toBe('Marketing Email Settings');
  });

  it('/marketing-email/settings wins over /marketing-email', () => {
    const crumbs = breadcrumbsForPath('/admin/marketing-email/settings');
    expect(crumbs[crumbs.length - 1].label).toBe('Marketing Email Settings');
    expect(crumbs[crumbs.length - 1].label).not.toBe('Marketing Email');
  });
});
