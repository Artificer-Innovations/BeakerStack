import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import renderer, { act as rendererAct } from 'react-test-renderer';
import { Image } from 'react-native';
import '@testing-library/jest-dom';
import { Platform } from 'react-native';
import { ProfileAvatar } from '@beakerstack/shared/components/profile/ProfileAvatar.native';
import type { UserProfile } from '@beakerstack/shared/types/profile';

// Mock Logger
jest.mock('@beakerstack/shared/utils/logger', () => ({
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

  it('merges cache buster when avatar URL already has query params', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/a.jpg?v=1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(<ProfileAvatar profile={profile} />);
    const image = screen.getByRole('img');
    const src = image.getAttribute('src') ?? '';
    expect(src).toContain('?v=1');
    expect(src).toContain('&t=');
  });

  it('rewrites localhost to Android emulator host in dev', () => {
    const prev = Platform.OS;
    try {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: 'android',
      });
      const profile: UserProfile = {
        id: '1',
        user_id: 'user-1',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url:
          'http://127.0.0.1:54321/storage/v1/object/public/avatars/x.png',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      render(<ProfileAvatar profile={profile} />);
      const image = screen.getByRole('img');
      expect(image.getAttribute('src')).toContain('10.0.2.2');
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: prev,
      });
    }
  });

  it('falls back to initials when the image fails to load', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: renderer.ReactTestRenderer;
    rendererAct(() => {
      tree = renderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    rendererAct(() => {
      image.props.onError?.({ nativeEvent: { error: 'Network error' } });
    });
    expect(JSON.stringify(tree.toJSON())).toContain('TU');
  });

  it('handles successful image load event', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: renderer.ReactTestRenderer;
    rendererAct(() => {
      tree = renderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    rendererAct(() => {
      image.props.onLoad?.();
    });
    expect(tree.root.findByType(Image)).toBeTruthy();
  });
});
