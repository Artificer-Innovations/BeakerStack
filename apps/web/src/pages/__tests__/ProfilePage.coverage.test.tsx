import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../ProfilePage';
import type { ProfileHeaderProps } from '@beakerstack/shared/components/profile/ProfileHeader.web';
import type { ProfileStatsProps } from '@beakerstack/shared/components/profile/ProfileStats.web';
import type { ProfileEditorProps } from '@beakerstack/shared/components/profile/ProfileEditor.web';
const profileCtx = vi.hoisted(() => ({
  loading: false,
  error: null as Error | null,
  profile: null as {
    display_name: string;
    username: string;
    id: string;
    user_id: string;
    bio: string | null;
    avatar_url: string | null;
    website: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  } | null,
  refreshProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'u1', email: 'user@example.com' },
    session: null,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock('@beakerstack/shared/contexts/ProfileContext', () => ({
  useProfileContext: () => ({
    loading: profileCtx.loading,
    error: profileCtx.error,
    profile: profileCtx.profile,
    refreshProfile: profileCtx.refreshProfile,
    supabaseClient: {},
    currentUser: null,
    fetchProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

vi.mock('@/components/AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => <header data-testid='app-header'>Header</header>,
}));

vi.mock('@beakerstack/shared/components/profile/ProfileHeader.web', () => ({
  ProfileHeader: ({ profile }: ProfileHeaderProps) => (
    <div data-testid='profile-header'>
      {profile ? profile.display_name : 'none'}
    </div>
  ),
}));

vi.mock('@beakerstack/shared/components/profile/ProfileStats.web', () => ({
  ProfileStats: ({ profile }: ProfileStatsProps) =>
    profile ? <div data-testid='profile-stats'>stats</div> : null,
}));

vi.mock('@beakerstack/shared/components/profile/ProfileEditor.web', () => ({
  ProfileEditor: ({ onSuccess, onError }: ProfileEditorProps) => (
    <div data-testid='profile-editor'>
      <button type='button' onClick={() => onSuccess?.()}>
        Save ok
      </button>
      <button type='button' onClick={() => onError?.(new Error('save failed'))}>
        Save bad
      </button>
    </div>
  ),
}));

const loggerError = vi.fn();
vi.mock('@beakerstack/logger', () => ({
  Logger: { error: (...a: unknown[]) => loggerError(...a) },
}));

describe('ProfilePage (context-driven UI)', () => {
  beforeEach(() => {
    profileCtx.loading = false;
    profileCtx.error = null;
    profileCtx.profile = {
      id: 'p1',
      user_id: 'u1',
      username: 'u',
      display_name: 'Visible',
      bio: null,
      avatar_url: null,
      website: null,
      location: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    profileCtx.refreshProfile.mockClear();
    loggerError.mockClear();
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

  it('shows loading state', () => {
    profileCtx.loading = true;
    renderPage();
    expect(screen.getByText(/Loading profile/i)).toBeInTheDocument();
  });

  it('shows error panel when profile fails to load', () => {
    profileCtx.error = new Error('Network down');
    renderPage();
    expect(screen.getByText(/Error loading profile/i)).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });

  it('opens editor and refreshes profile on successful save', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }));
    await user.click(screen.getByRole('button', { name: /Save ok/i }));
    await waitFor(() => {
      expect(profileCtx.refreshProfile).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('profile-editor')).not.toBeInTheDocument();
  });

  it('logs when editor reports an error', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }));
    await user.click(screen.getByRole('button', { name: /Save bad/i }));
    await waitFor(() => {
      expect(loggerError).toHaveBeenCalledWith(
        'Profile save error:',
        expect.any(Error)
      );
    });
  });

  it('renders stats when profile exists', () => {
    renderPage();
    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });
});
