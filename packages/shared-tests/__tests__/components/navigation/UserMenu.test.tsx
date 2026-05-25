import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { UserMenu } from '@beakerstack/shared/components/navigation/UserMenu.web';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockProfile: UserProfile = {
  id: 'test-user-id',
  user_id: 'test-user-id',
  username: 'testuser',
  display_name: 'Test User',
  bio: 'Test bio',
  avatar_url: null,
  website: null,
  location: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const createMockSupabaseClient = (): SupabaseClient => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => mockChannel),
    unsubscribe: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
  };

  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'token',
          },
        },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      }),
    })),
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  } as unknown as SupabaseClient;
};

const renderWithProviders = (component: React.ReactElement) => {
  const mockClient = createMockSupabaseClient();
  return render(
    <BrowserRouter>
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          {component}
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('UserMenu (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user avatar button', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });
  });

  it('should open menu when avatar is clicked', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display user email when profile display_name is not available', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={null} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      // Should show email prefix as display name
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display username when display_name is not available', async () => {
    const profileWithoutDisplayName: UserProfile = {
      ...mockProfile,
      display_name: null,
    };

    renderWithProviders(
      <UserMenu user={mockUser} profile={profileWithoutDisplayName} />
    );
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  it('should display "User" as fallback when no name is available', async () => {
    const userWithoutEmail: User = {
      ...mockUser,
      email: null,
    };

    renderWithProviders(<UserMenu user={userWithoutEmail} profile={null} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  it('should show menu items when open', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Billing')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('should toggle menu closed when avatar is clicked again', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });
    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);
    await waitFor(() =>
      expect(screen.getByText('Profile')).toBeInTheDocument()
    );
    fireEvent.click(menuButton);
    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('should link to billing page from menu', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByText('Billing')).toBeInTheDocument()
    );
    expect(screen.getByText('Billing').closest('a')).toHaveAttribute(
      'href',
      '/billing'
    );
  });

  it('should close menu when clicking outside', async () => {
    renderWithProviders(
      <div>
        <div data-testid='outside'>Outside</div>
        <UserMenu user={mockUser} profile={mockProfile} />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('should have correct links to Profile and Dashboard', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const profileLink = screen.getByText('Profile').closest('a');
      const dashboardLink = screen.getByText('Dashboard').closest('a');

      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  it('should have aria-expanded attribute that changes with menu state', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should handle sign out', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    // Wait for sign out to complete and menu to close
    await waitFor(
      () => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should close menu when Profile link is clicked', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);
    await waitFor(() =>
      expect(screen.getByText('Profile')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('link', { name: 'Profile' }));

    await waitFor(() => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should close menu when Dashboard link is clicked', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);
    await waitFor(() =>
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    await waitFor(() => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should close menu when Billing link is clicked', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    const menuButton = screen.getByLabelText('User menu');
    fireEvent.click(menuButton);
    await waitFor(() =>
      expect(screen.getByText('Billing')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('link', { name: 'Billing' }));

    await waitFor(() => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should not render email row when user has no email', async () => {
    const userWithoutEmail: User = { ...mockUser, email: undefined };
    renderWithProviders(
      <UserMenu user={userWithoutEmail} profile={mockProfile} />
    );
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByText('Test User')).toBeInTheDocument()
    );
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('should show Admin link when showAdminLink is true', async () => {
    renderWithProviders(
      <UserMenu user={mockUser} profile={mockProfile} showAdminLink={true} />
    );
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin'
    );
  });

  it('should not show Admin link when showAdminLink is false', async () => {
    renderWithProviders(
      <UserMenu user={mockUser} profile={mockProfile} showAdminLink={false} />
    );
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('link', { name: 'Admin' })
    ).not.toBeInTheDocument();
  });

  it('should not show Admin link when showAdminLink is omitted', async () => {
    renderWithProviders(<UserMenu user={mockUser} profile={mockProfile} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('link', { name: 'Admin' })
    ).not.toBeInTheDocument();
  });

  it('should close menu when Admin link is clicked', async () => {
    renderWithProviders(
      <UserMenu user={mockUser} profile={mockProfile} showAdminLink={true} />
    );
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('link', { name: 'Admin' }));
    await waitFor(() => {
      expect(screen.getByLabelText('User menu')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });
});
