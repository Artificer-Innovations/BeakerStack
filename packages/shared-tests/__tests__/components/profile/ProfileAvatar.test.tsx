import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProfileAvatar } from '@shared/src/components/profile/ProfileAvatar.web';
import type { UserProfile } from '@shared/src/types/profile';

describe('ProfileAvatar', () => {
  const mockProfile: UserProfile = {
    id: 'profile-id-1',
    user_id: 'user-id-1',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'Test bio',
    avatar_url: 'https://example.com/avatar.jpg',
    website: null,
    location: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('renders avatar image when avatar_url is provided', () => {
    render(<ProfileAvatar profile={mockProfile} />);
    const img = screen.getByAltText('Test User');
    expect(img).toBeInTheDocument();
    // Component adds cache-busting to displayed URLs, so check for base URL with query params
    expect(img).toHaveAttribute('src', expect.stringMatching(/^https:\/\/example\.com\/avatar\.jpg\?t=/));
  });

  it('renders initials when avatar_url is not provided', () => {
    const profileWithoutAvatar = { ...mockProfile, avatar_url: null };
    render(<ProfileAvatar profile={profileWithoutAvatar} />);
    const avatar = screen.getByRole('img', { name: /avatar for test user/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('TU');
  });

  it('uses display_name for initials when available', () => {
    const profileWithoutAvatar = { ...mockProfile, avatar_url: null };
    render(<ProfileAvatar profile={profileWithoutAvatar} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveTextContent('TU');
  });

  it('uses username for initials when display_name is not available', () => {
    const profileWithUsernameOnly = {
      ...mockProfile,
      avatar_url: null,
      display_name: null,
    };
    render(<ProfileAvatar profile={profileWithUsernameOnly} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveTextContent('T');
  });

  it('shows question mark when no name or username available', () => {
    const profileWithoutName = {
      ...mockProfile,
      avatar_url: null,
      display_name: null,
      username: null,
    };
    render(<ProfileAvatar profile={profileWithoutName} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveTextContent('?');
  });

  it('handles single word display_name correctly', () => {
    const profileSingleName = {
      ...mockProfile,
      avatar_url: null,
      display_name: 'Single',
    };
    render(<ProfileAvatar profile={profileSingleName} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveTextContent('S');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<ProfileAvatar profile={mockProfile} size="small" />);
    let img = screen.getByAltText('Test User');
    expect(img).toHaveClass('w-12', 'h-12');

    rerender(<ProfileAvatar profile={mockProfile} size="medium" />);
    img = screen.getByAltText('Test User');
    expect(img).toHaveClass('w-20', 'h-20');

    rerender(<ProfileAvatar profile={mockProfile} size="large" />);
    img = screen.getByAltText('Test User');
    expect(img).toHaveClass('w-32', 'h-32');
  });

  it('handles null profile gracefully', () => {
    render(<ProfileAvatar profile={null} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('?');
  });
});

