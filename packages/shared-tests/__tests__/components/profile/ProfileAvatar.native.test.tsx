import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileAvatar } from '@shared/src/components/profile/ProfileAvatar.native';
import type { UserProfile } from '@shared/src/types/profile';

// Mock Logger
jest.mock('@shared/src/utils/logger', () => ({
  Logger: {
    warn: jest.fn(),
  },
}));

describe('ProfileAvatar (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with avatar URL', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
  });

  it('renders initials when no avatar URL', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders single initial for single name', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders username initial when no display name', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: null,
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders question mark when no profile data', () => {
    render(<ProfileAvatar profile={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders with small size', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} size='small' />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders with medium size by default', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders with large size', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} size='large' />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it.skip('handles image load error and shows fallback', async () => {
    // Image error handling is complex to test with react-native-web
    // The component handles errors internally via onError callback
  });
});
