import { render } from '@testing-library/react-native';
import { AppNavigator } from '../../src/navigation/AppNavigator';
import { useFeatureFlags } from '../../src/config/featureFlags';

// Mock feature flags
jest.mock('../../src/config/featureFlags', () => ({
  useFeatureFlags: jest.fn(),
}));

// Mock screens
jest.mock('../../src/screens/HomeScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='home-screen'>
      <Text>Home Screen</Text>
    </View>
  );
});

jest.mock('../../src/screens/LoginScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='login-screen'>
      <Text>Login Screen</Text>
    </View>
  );
});

jest.mock('../../src/screens/SignupScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='signup-screen'>
      <Text>Signup Screen</Text>
    </View>
  );
});

jest.mock('../../src/screens/DashboardScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='dashboard-screen'>
      <Text>Dashboard Screen</Text>
    </View>
  );
});

jest.mock('../../src/screens/ProfileScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='profile-screen'>
      <Text>Profile Screen</Text>
    </View>
  );
});

jest.mock('../../src/screens/BillingScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='billing-screen'>
      <Text>Billing Screen</Text>
    </View>
  );
});

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFeatureFlags as jest.Mock).mockReturnValue({
      showNativeHeader: false,
    });
  });

  it('renders navigation container', () => {
    const { getByTestId } = render(<AppNavigator />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('configures navigation with feature flags', () => {
    (useFeatureFlags as jest.Mock).mockReturnValue({
      showNativeHeader: true,
    });

    const { getByTestId } = render(<AppNavigator />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('exposes navigation ref in dev mode', () => {
    const originalDev = __DEV__;
    // @ts-expect-error test-only assignment to global __DEV__
    global.__DEV__ = true;

    render(<AppNavigator />);

    // Navigation ref should be exposed to global scope in dev mode
    expect((global as any).navigationRef).toBeDefined();

    // @ts-expect-error test-only assignment to global __DEV__
    global.__DEV__ = originalDev;
  });

  it('does not expose navigation ref when __DEV__ is false', () => {
    const g = globalThis as { __DEV__?: boolean; navigationRef?: unknown };
    const originalDev = g.__DEV__;
    try {
      delete (g as { navigationRef?: unknown }).navigationRef;

      Object.defineProperty(g, '__DEV__', {
        value: false,
        configurable: true,
        writable: true,
      });

      render(<AppNavigator />);

      expect(g.navigationRef).toBeUndefined();
    } finally {
      Object.defineProperty(g, '__DEV__', {
        value: originalDev,
        configurable: true,
        writable: true,
      });
    }
  });
});
