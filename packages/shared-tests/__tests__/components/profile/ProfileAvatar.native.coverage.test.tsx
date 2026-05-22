import { describe, it, expect } from '@jest/globals';
import TestRenderer, { act as rendererAct } from 'react-test-renderer';
import { Image } from 'react-native';
import { ProfileAvatar } from '@beakerstack/shared/components/profile/ProfileAvatar.native';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ProfileAvatar.native — coverage gaps', () => {
  it('uses first initial for single-word display names', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Ada',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('A');
  });

  it('logs image load failures with native error payload', () => {
    const { Logger } = require('@beakerstack/logger');
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    rendererAct(() => {
      image.props.onError?.({ nativeEvent: { error: 'Network error' } });
    });

    expect(Logger.warn).toHaveBeenCalledWith(
      '[ProfileAvatar] Failed to load image:',
      expect.any(String),
      'Network error'
    );
  });

  it('uses two initials for multi-word display names', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Ada Lovelace',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('AL');
  });

  it('rewrites localhost avatar URLs on Android in dev mode', () => {
    const RN = require('react-native');
    const originalOs = RN.Platform.OS;
    Object.defineProperty(RN.Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    // @ts-expect-error test-only assignment to global __DEV__
    global.__DEV__ = true;

    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url:
        'http://127.0.0.1:54321/storage/v1/object/public/avatars/a.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    expect(String(image.props.source.uri)).toContain('http://10.0.2.2:54321');

    Object.defineProperty(RN.Platform, 'OS', {
      configurable: true,
      value: originalOs,
    });
    // @ts-expect-error test-only assignment to global __DEV__
    global.__DEV__ = false;
  });

  it('resets image error state after a successful load', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    rendererAct(() => {
      image.props.onError?.({ nativeEvent: { error: 'Network error' } });
      image.props.onLoad?.();
    });
    expect(tree.root.findAllByType(Image).length).toBe(1);
  });

  it('supports small and large size variants', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(
        <ProfileAvatar profile={profile} size='small' />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('"fontSize":"14px"');

    rendererAct(() => {
      tree.update(<ProfileAvatar profile={profile} size='large' />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('"fontSize":"24px"');
  });

  it('falls back to question mark when no usable initials exist', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: null,
      display_name: null,
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('?');
  });

  it('uses username initial when display name is whitespace only', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'zeta',
      display_name: '   ',
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Z');
  });

  it('appends cache buster to avatar URLs that already include query params', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg?existing=1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    const image = tree.root.findByType(Image);
    expect(String(image.props.source.uri)).toMatch(/existing=1&t=\d+/);
  });

  it('uses username initial when display name is absent', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'zeta',
      display_name: null,
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Z');
  });

  it('falls back to question mark when username is empty', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: '',
      display_name: null,
      avatar_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('?');
  });

  it('logs raw error objects when nativeEvent is missing', () => {
    const { Logger } = require('@beakerstack/logger');
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    let tree!: TestRenderer.ReactTestRenderer;
    rendererAct(() => {
      tree = TestRenderer.create(<ProfileAvatar profile={profile} />);
    });
    rendererAct(() => {
      tree.root.findByType(Image).props.onError?.({ message: 'plain error' });
    });

    expect(Logger.warn).toHaveBeenCalledWith(
      '[ProfileAvatar] Failed to load image:',
      expect.any(String),
      expect.objectContaining({ message: 'plain error' })
    );
  });
});
