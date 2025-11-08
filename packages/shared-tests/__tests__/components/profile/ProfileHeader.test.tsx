import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProfileHeader } from '@shared/src/components/profile/ProfileHeader.web';
import type { UserProfile } from '@shared/src/types/profile';

// Mock ProfileAvatar
jest.mock('@shared/src/components/profile/ProfileAvatar.web', () => ({
  ProfileAvatar: ({ profile }: any) => (
    <div data-testid='profile-avatar'>
      {profile?.avatar_url ? 'Avatar' : 'No Avatar'}
    </div>
  ),
}));

describe('ProfileHeader', () => {
  const mockProfile: UserProfile = {
    id: 'profile-id-1',
    user_id: 'user-id-1',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'This is a test bio',
    avatar_url: 'https://example.com/avatar.jpg',
    website: 'https://example.com',
    location: 'San Francisco, CA',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('renders profile header with all information', () => {
    render(<ProfileHeader profile={mockProfile} email="test@example.com" />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('This is a test bio')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    // Check for website link specifically (not just the text)
    const websiteLink = screen.getByRole('link', { name: /example\.com/i });
    expect(websiteLink).toBeInTheDocument();
  });

  it('renders message when profile is null', () => {
    render(<ProfileHeader profile={null} />);
    expect(screen.getByText('No profile data available.')).toBeInTheDocument();
  });

  it('uses username as display name when display_name is not available', () => {
    const profileWithoutDisplayName = {
      ...mockProfile,
      display_name: null,
    };
    render(<ProfileHeader profile={profileWithoutDisplayName} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('shows Anonymous User when neither display_name nor username is available', () => {
    const profileWithoutName = {
      ...mockProfile,
      display_name: null,
      username: null,
    };
    render(<ProfileHeader profile={profileWithoutName} />);
    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
  });

  it('does not render username when username is not available', () => {
    const profileWithoutUsername = {
      ...mockProfile,
      username: null,
    };
    render(<ProfileHeader profile={profileWithoutUsername} />);
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('does not render bio when bio is not available', () => {
    const profileWithoutBio = {
      ...mockProfile,
      bio: null,
    };
    render(<ProfileHeader profile={profileWithoutBio} />);
    expect(screen.queryByText('This is a test bio')).not.toBeInTheDocument();
  });

  it('does not render location/website section when both are missing', () => {
    const profileWithoutLocationAndWebsite = {
      ...mockProfile,
      location: null,
      website: null,
    };
    render(<ProfileHeader profile={profileWithoutLocationAndWebsite} />);
    expect(screen.queryByText(/📍|🔗/)).not.toBeInTheDocument();
  });

  it('renders location when website is not available', () => {
    const profileWithLocationOnly = {
      ...mockProfile,
      website: null,
    };
    render(<ProfileHeader profile={profileWithLocationOnly} />);
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('renders website when location is not available', () => {
    const profileWithWebsiteOnly = {
      ...mockProfile,
      location: null,
    };
    render(<ProfileHeader profile={profileWithWebsiteOnly} />);
    expect(screen.getByText(/example\.com/)).toBeInTheDocument();
  });

  it('website link opens in new tab with proper attributes', () => {
    render(<ProfileHeader profile={mockProfile} />);
    const link = screen.getByText(/example\.com/).closest('a');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('strips http:// and https:// from website display', () => {
    const profileWithHttp = {
      ...mockProfile,
      website: 'http://example.com',
    };
    render(<ProfileHeader profile={profileWithHttp} />);
    expect(screen.getByText(/^example\.com$/)).toBeInTheDocument();
  });

  it('strips trailing slash from website display', () => {
    const profileWithTrailingSlash = {
      ...mockProfile,
      website: 'https://example.com/',
    };
    render(<ProfileHeader profile={profileWithTrailingSlash} />);
    expect(screen.getByText(/^example\.com$/)).toBeInTheDocument();
  });

  it('renders email when provided', () => {
    render(<ProfileHeader profile={mockProfile} email="user@example.com" />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('does not render email section when email is not provided', () => {
    render(<ProfileHeader profile={mockProfile} email={null} />);
    expect(screen.queryByText(/user@example.com/)).not.toBeInTheDocument();
  });

  it('renders email without other metadata', () => {
    const profileWithoutMetadata = {
      ...mockProfile,
      location: null,
      website: null,
    };
    render(<ProfileHeader profile={profileWithoutMetadata} email="solo@example.com" />);
    expect(screen.getByText('solo@example.com')).toBeInTheDocument();
  });
});
