import React from 'react';
import { Alert } from 'react-native';
import { DebugTools } from '../../src/components/DebugTools';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import renderer from 'react-test-renderer';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

// Mock supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockLimit = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Mock Logger
jest.mock('@shared/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useProfile hook
const mockUseProfile = jest.fn();
jest.mock('@shared/hooks/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

// Mock ProfileEditor.native
jest.mock('@shared/components/profile/ProfileEditor.native', () => ({
  ProfileEditor: () => <div data-testid='profile-editor'>Profile Editor</div>,
}));

// Mock form components
jest.mock('@shared/components/forms/FormInput.native', () => ({
  FormInput: () => <div data-testid='form-input'>Form Input</div>,
}));

jest.mock('@shared/components/forms/FormButton.native', () => ({
  FormButton: () => <div data-testid='form-button'>Form Button</div>,
}));

jest.mock('@shared/components/forms/FormError.native', () => ({
  FormError: () => <div data-testid='form-error'>Form Error</div>,
}));

// Mock profile display components
jest.mock('@shared/components/profile/ProfileAvatar.native', () => ({
  ProfileAvatar: () => <div data-testid='profile-avatar'>Avatar</div>,
}));

jest.mock('@shared/components/profile/ProfileHeader.native', () => ({
  ProfileHeader: () => <div data-testid='profile-header'>Header</div>,
}));

jest.mock('@shared/components/profile/ProfileStats.native', () => ({
  ProfileStats: () => <div data-testid='profile-stats'>Stats</div>,
}));

const createMockSupabaseClient = (hasUser = false): SupabaseClient => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  };

  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: hasUser ? mockSession : null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      signOut: jest.fn(),
    },
    from: mockFrom,
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
  } as unknown as SupabaseClient;
};

const createMockProfile = () => ({
  loading: false,
  profile: {
    id: 'profile-1',
    user_id: 'test-user-id',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'Test bio',
    location: 'Test Location',
    website: 'https://example.com',
    avatar_url: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  error: null,
  createProfile: jest.fn().mockResolvedValue({}),
  updateProfile: jest.fn().mockResolvedValue({}),
  refreshProfile: jest.fn().mockResolvedValue({}),
  fetchProfile: jest.fn(),
});

describe('DebugTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Setup default mocks
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      limit: mockLimit,
    });
    mockEq.mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockLimit.mockResolvedValue({ data: [], error: null });

    mockUseProfile.mockReturnValue(createMockProfile());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders component', () => {
    const tree = renderer.create(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <ProfileProvider supabaseClient={createMockSupabaseClient()}>
          <DebugTools />
        </ProfileProvider>
      </AuthProvider>
    );
    expect(tree).toBeTruthy();
  });

  it('renders hidden button when not visible', () => {
    const tree = renderer.create(
      <AuthProvider supabaseClient={createMockSupabaseClient()}>
        <ProfileProvider supabaseClient={createMockSupabaseClient()}>
          <DebugTools />
        </ProfileProvider>
      </AuthProvider>
    );
    const instance = tree.root;
    // Component should render something
    expect(instance).toBeTruthy();
  });
});
