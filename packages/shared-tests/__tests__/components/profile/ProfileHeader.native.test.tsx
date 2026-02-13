import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileHeader } from '@shared/src/components/profile/ProfileHeader.native';
import type { UserProfile } from '@shared/src/types/profile';

// Mock Linking
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      openURL: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock Logger
jest.mock('@shared/src/utils/logger', () => ({
  Logger: {
    warn: jest.fn(),
  },
}));

// Mock ProfileAvatar
jest.mock('@shared/src/components/profile/ProfileAvatar.native', () => ({
  ProfileAvatar: ({ profile }: { profile: UserProfile | null }) => (
    <div data-testid='profile-avatar'>{profile?.display_name || 'Avatar'}</div>
  ),
}));

describe('ProfileHeader (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile header with all data', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Test bio',
      location: 'Test Location',
      website: 'https://example.com',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} email='test@example.com' />);
    // "Test User" appears in both ProfileAvatar mock and the component, so use getAllByText
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    // Check for email text (might be in a container with emoji)
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
    // Check for location (might be in a container with emoji)
    expect(screen.getByText(/Test Location/)).toBeInTheDocument();
    expect(screen.getByText('Test bio')).toBeInTheDocument();
  });

  it('renders empty state when profile is null', () => {
    render(<ProfileHeader profile={null} />);
    expect(screen.getByText('No profile data available.')).toBeInTheDocument();
  });

  it('renders display name fallback to username', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('renders anonymous user when no display name or username', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: null,
      display_name: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} />);
    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
  });

  it('does not render username when not available', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: null,
      display_name: 'Test User',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} />);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('handles website URL formatting', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      website: 'https://example.com/',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} />);
    // Website should be displayed without protocol and trailing slash
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('does not render metadata section when no metadata', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} />);
    expect(screen.queryByText(/✉️|📍|🔗/)).not.toBeInTheDocument();
  });

  it('renders only email when other metadata is missing', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileHeader profile={profile} email='test@example.com' />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
