import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestRenderer, { act as testAct } from 'react-test-renderer';
import { UserMenu } from '@beakerstack/shared/components/navigation/UserMenu.native';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/shared/components/profile/ProfileAvatar.native', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    ProfileAvatar: () =>
      React.createElement(RN.View, { testID: 'profile-avatar' }),
  };
});

const USER_MENU_TEST_PLATFORM_OS_KEY =
  '__BeakerStack_UserMenuNativeTest_platformOs';

function userMenuPlatformOsRef(): { current: string } {
  const g = globalThis as Record<string, { current: string } | undefined>;
  if (!g[USER_MENU_TEST_PLATFORM_OS_KEY]) {
    g[USER_MENU_TEST_PLATFORM_OS_KEY] = { current: 'ios' };
  }
  return g[USER_MENU_TEST_PLATFORM_OS_KEY]!;
}

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const key = '__BeakerStack_UserMenuNativeTest_platformOs';
  const platformOsRef = (): { current: string } => {
    const g = globalThis as Record<string, { current: string } | undefined>;
    if (!g[key]) {
      g[key] = { current: 'ios' };
    }
    return g[key]!;
  };
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Modal: ({ visible, children }: { visible: boolean; children: unknown }) => {
      const React = require('react');
      return visible
        ? React.createElement(
            'motion',
            { 'data-testid': 'user-menu-modal' },
            children
          )
        : null;
    },
    Platform: {
      ...RN.Platform,
      get OS() {
        return platformOsRef().current;
      },
    },
  };
});

const createMockSupabaseClient = (): SupabaseClient =>
  ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }) as unknown as SupabaseClient;

const createMockUser = (): User =>
  ({
    id: 'user-1',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01',
    app_metadata: {},
    user_metadata: {},
  }) as User;

const createMockProfile = (): UserProfile => ({
  id: '1',
  user_id: 'user-1',
  username: 'testuser',
  display_name: 'Test User',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
});

const mockNavigation = { navigate: jest.fn() } as any;

describe('UserMenu.native — coverage gaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    userMenuPlatformOsRef().current = 'ios';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('positions menu from avatar measure callback on iOS', async () => {
    const UIManager = require('react-native').UIManager;
    jest.spyOn(UIManager, 'measure').mockImplementation((_node, callback) => {
      callback(0, 0, 48, 48, 300, 20);
    });

    render(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <UserMenu
          user={createMockUser()}
          profile={createMockProfile()}
          navigation={mockNavigation}
        />
      </AuthProvider>
    );

    fireEvent.click(screen.getByLabelText('Open user menu'));
    jest.runAllTimers();
    await screen.findByText('Profile');
    expect(UIManager.measure).toHaveBeenCalled();
  });

  it('uses Android menu positioning branch', async () => {
    userMenuPlatformOsRef().current = 'android';

    render(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <UserMenu
          user={createMockUser()}
          profile={createMockProfile()}
          navigation={mockNavigation}
        />
      </AuthProvider>
    );

    fireEvent.click(screen.getByLabelText('Open user menu'));
    jest.runAllTimers();
    expect(await screen.findByText('Profile')).toBeTruthy();
  });

  it('handles onStartShouldSetResponder on the open menu container', () => {
    let tree!: TestRenderer.ReactTestRenderer;

    testAct(() => {
      tree = TestRenderer.create(
        <AuthProvider supabaseClient={createMockSupabaseClient()}>
          <UserMenu
            user={createMockUser()}
            profile={createMockProfile()}
            navigation={mockNavigation}
          />
        </AuthProvider>
      );
    });

    testAct(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Open user menu' })
        .props.onPress();
    });

    const menuNode = tree.root.findAll(
      node => typeof node.props?.onStartShouldSetResponder === 'function'
    )[0];

    expect(menuNode).toBeDefined();
    expect(menuNode.props.onStartShouldSetResponder()).toBe(true);
  });
});
