// Mock expo-constants (added in our auth changes)
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
    manifest: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

// Mock configureGoogleSignIn (added in our auth changes)
jest.mock('@shared/hooks/useAuth', () => ({
  configureGoogleSignIn: jest.fn(),
  useAuth: jest.fn(),
}));

// Mock the Supabase client module entirely
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// Mock AuthContext to avoid needing the full provider setup in tests
jest.mock('@shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuthContext: () => ({
    user: null,
    session: null,
    loading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithGoogle: jest.fn(),
  }),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: any) => children,
      Screen: ({ component: Component, ...props }: any) => {
        if (Component) {
          // Create a mock navigation prop for screens that need it
          const mockNavigation = {
            navigate: jest.fn(),
            replace: jest.fn(),
            goBack: jest.fn(),
          };
          return <Component navigation={mockNavigation} {...props} />;
        }
        return null;
      },
    }),
  };
});

// Mock ProtectedRoute to avoid React Native component issues in tests
jest.mock('@shared/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: any) => children,
}));

// Mock form components to avoid StyleSheet.create() native bridge issues in tests
jest.mock('@shared/components/forms/FormInput.native', () => ({
  FormInput: ({ label, value, onChange, ...props }: any) => {
    const React = require('react');
    const { TextInput, View, Text } = require('react-native');
    return (
      <View>
        <Text>{label}</Text>
        <TextInput value={value} onChangeText={onChange} {...props} />
      </View>
    );
  },
}));

jest.mock('@shared/components/forms/FormButton.native', () => ({
  FormButton: ({ title, onPress, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} {...props}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@shared/components/forms/FormError.native', () => ({
  FormError: ({ message }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return message ? <Text>{message}</Text> : null;
  },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import App from '../App';
import { HOME_TITLE } from '@shared/utils/strings';

describe('Mobile App', () => {
  it('renders without crashing', () => {
    const { getAllByText } = render(<App />);

    // Check if the app content is rendered
    // Title appears in both header and main content
    const titles = getAllByText(HOME_TITLE);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<App />);

    // Check if subtitle is present
    expect(
      getByText(
        'A modern full-stack application with React, React Native, and Supabase'
      )
    ).toBeTruthy();
  });
});
