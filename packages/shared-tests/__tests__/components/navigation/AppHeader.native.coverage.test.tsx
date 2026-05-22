import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { BRANDING } from '@beakerstack/shared/config/branding';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const APP_HEADER_PLATFORM_OS_KEY =
  '__BeakerStack_AppHeaderNativeTest_platformOs';
const APP_HEADER_STATUS_BAR_HEIGHT_KEY =
  '__BeakerStack_AppHeaderNativeTest_statusBarHeight';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const platformKey = '__BeakerStack_AppHeaderNativeTest_platformOs';
  const statusBarKey = '__BeakerStack_AppHeaderNativeTest_statusBarHeight';
  const platformOsRef = () => {
    const g = globalThis as Record<string, { current: string } | undefined>;
    if (!g[platformKey]) g[platformKey] = { current: 'ios' };
    return g[platformKey]!;
  };
  const statusBarHeightRef = () => {
    const g = globalThis as Record<
      string,
      { current: number | null } | undefined
    >;
    if (!g[statusBarKey]) g[statusBarKey] = { current: 24 };
    return g[statusBarKey]!;
  };
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      get OS() {
        return platformOsRef().current;
      },
    },
    StatusBar: {
      get currentHeight() {
        return platformOsRef().current === 'android'
          ? statusBarHeightRef().current
          : 0;
      },
    },
  };
});

jest.mock('@beakerstack/shared/components/navigation/UserMenu.native', () => ({
  UserMenu: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'user-menu' });
  },
}));

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
    },
  }) as unknown as SupabaseClient;

function platformOsRef(): { current: string } {
  const g = globalThis as Record<string, { current: string } | undefined>;
  if (!g[APP_HEADER_PLATFORM_OS_KEY]) {
    g[APP_HEADER_PLATFORM_OS_KEY] = { current: 'ios' };
  }
  return g[APP_HEADER_PLATFORM_OS_KEY]!;
}

function statusBarHeightRef(): { current: number | null } {
  const g = globalThis as Record<
    string,
    { current: number | null } | undefined
  >;
  if (!g[APP_HEADER_STATUS_BAR_HEIGHT_KEY]) {
    g[APP_HEADER_STATUS_BAR_HEIGHT_KEY] = { current: 24 };
  }
  return g[APP_HEADER_STATUS_BAR_HEIGHT_KEY]!;
}

describe('AppHeader.native — coverage gaps', () => {
  beforeEach(() => {
    platformOsRef().current = 'ios';
    statusBarHeightRef().current = 24;
  });

  it('uses Android status bar height when available', async () => {
    platformOsRef().current = 'android';
    statusBarHeightRef().current = 32;

    render(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <ProfileProvider supabaseClient={createMockSupabaseClient()}>
          <AppHeader supabaseClient={createMockSupabaseClient()} />
        </ProfileProvider>
      </AuthProvider>
    );

    await screen.findByText(BRANDING.displayName);
    expect(screen.getByText(BRANDING.displayName)).toBeInTheDocument();
  });

  it('uses Android status bar height of zero when currentHeight is unset', async () => {
    platformOsRef().current = 'android';
    statusBarHeightRef().current = null;

    render(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <ProfileProvider supabaseClient={createMockSupabaseClient()}>
          <AppHeader supabaseClient={createMockSupabaseClient()} />
        </ProfileProvider>
      </AuthProvider>
    );

    await screen.findByText(BRANDING.displayName);
    expect(screen.getByText(BRANDING.displayName)).toBeInTheDocument();
  });
});
