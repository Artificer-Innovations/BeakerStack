import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TestRenderer, { act as rendererAct } from 'react-test-renderer';
import { ProfileAvatar } from '@beakerstack/shared/components/profile/ProfileAvatar.web';
import type { UserProfile } from '@beakerstack/shared/types/profile';

const baseProfile: UserProfile = {
  id: 'profile-id-1',
  user_id: 'user-id-1',
  username: 'testuser',
  display_name: 'Test User',
  bio: null,
  avatar_url: 'https://example.com/avatar.jpg',
  website: null,
  location: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProfileAvatar.web — coverage gaps', () => {
  it('uses medium size by default', () => {
    render(<ProfileAvatar profile={baseProfile} />);
    expect(screen.getByRole('img')).toHaveClass('w-20', 'h-20');
  });

  it('uses first initial when display name has one word', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: 'Ada',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('A');
  });

  it('uses username initial when display name is whitespace only', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: '   ',
      username: 'zeta',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('Z');
  });

  it('uses username in alt text when display name is missing', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: null,
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByAltText('testuser')).toBeInTheDocument();
  });

  it('uses generic alt text when profile names are missing', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: null,
      username: null,
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByAltText('User avatar')).toBeInTheDocument();
  });

  it('supports small and large size variants', () => {
    const { rerender } = render(
      <ProfileAvatar profile={baseProfile} size='small' />
    );
    expect(screen.getByRole('img')).toHaveClass('w-12', 'h-12');

    rerender(<ProfileAvatar profile={baseProfile} size='large' />);
    expect(screen.getByRole('img')).toHaveClass('w-32', 'h-32');
  });

  it('uses two initials for multi-word display names', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: 'Ada Lovelace',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('AL');
  });

  it('uses username initial when display name words lack characters', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: '  ',
      username: 'zeta',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('Z');
  });

  it('falls back to initials when image load fails', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: 'Test User',
    };
    const parent = document.createElement('div');
    const target = document.createElement('img');
    Object.defineProperty(target, 'parentElement', { value: parent });
    parent.appendChild(target);

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });

    rendererAct(() => {
      tree.root.findByType('img').props.onError?.({ target });
    });

    expect(parent.innerHTML).toContain('TU');
  });

  it('ignores image load errors when parent element is missing', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: 'Test User',
    };
    const target = document.createElement('img');
    Object.defineProperty(target, 'parentElement', { value: null });

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });

    expect(() => {
      rendererAct(() => {
        tree.root.findByType('img').props.onError?.({ target });
      });
    }).not.toThrow();
  });

  it('uses two initials for short multi-word names', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: 'A B',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('AB');
  });

  it('renders fallback initials for a null profile', () => {
    render(<ProfileAvatar profile={null} />);
    expect(screen.getByRole('img')).toHaveTextContent('?');
  });

  it('uses only the first initial when the last word is empty', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: 'Hello  ',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('H');
  });

  it('renders with default className on the image path', () => {
    render(<ProfileAvatar profile={baseProfile} />);
    expect(screen.getByRole('img')).not.toHaveClass('custom-class');
  });

  it('uses username in alt text when avatar image is shown without display name', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: null,
      username: 'zeta',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByAltText('zeta')).toBeInTheDocument();
  });

  it('uses generic alt text when avatar image is shown without profile names', () => {
    const profile: UserProfile = {
      ...baseProfile,
      display_name: null,
      username: null,
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByAltText('User avatar')).toBeInTheDocument();
  });

  it('falls back to username initial when multi-word display name lacks usable characters', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: null,
      display_name: '  ',
      username: 'zeta',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveTextContent('Z');
  });

  it('keeps avatar URLs that already include query parameters', () => {
    const profile: UserProfile = {
      ...baseProfile,
      avatar_url: 'https://example.com/avatar.jpg?existing=1',
    };
    render(<ProfileAvatar profile={profile} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/avatar.jpg?existing=1'
    );
  });
});
