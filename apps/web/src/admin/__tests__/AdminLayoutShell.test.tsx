import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayoutShell } from '../AdminLayoutShell';

const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({ signOut: mockSignOut }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
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
    const signOutButton = within(sidebar).getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
