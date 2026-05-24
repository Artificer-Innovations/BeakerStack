import { render, waitFor } from '@testing-library/react-native';
import {
  configureAdopter,
  resetAdopterConfigForTests,
} from '@beakerstack/shared/config/adopterRuntime';
import { adopterConfig } from '@adopter/config';
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

jest.mock('../../../../adopter/mobile/screens/DashboardScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='dashboard-screen'>
      <Text>Dashboard Screen</Text>
    </View>
  );
});

jest.mock('../../../../adopter/mobile/screenExtensions', () => {
  const { View, Text } = require('react-native');
  const DashboardScreen = () => (
    <View testID='dashboard-screen'>
      <Text>Dashboard Screen</Text>
    </View>
  );
  const PublicAdopterScreen = () => <View testID='public-adopter-screen' />;

  return {
    adopterStackScreens: [
      {
        name: 'PublicAdopter',
        component: PublicAdopterScreen,
        auth: 'public',
      },
      {
        name: 'Dashboard',
        component: DashboardScreen,
        auth: 'protected',
      },
    ],
  };
});

jest.mock('../../src/screens/ProfileScreen', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID='profile-screen'>
      <Text>Profile Screen</Text>
    </View>
  );
});

jest.mock('../../src/navigation/BillingNavigator', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID='billing-screen'>
        <Text>Billing Screen</Text>
      </View>
    ),
  };
});

jest.mock('../../src/screens/ForgotPasswordScreen', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID='forgot-password-screen'>
        <Text>Forgot Password Screen</Text>
      </View>
    ),
  };
});

jest.mock('../../src/screens/AuthCallbackScreen', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID='auth-callback-screen'>
        <Text>Auth Callback Screen</Text>
      </View>
    ),
  };
});

jest.mock('../../src/screens/ResetPasswordScreen', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID='reset-password-screen'>
        <Text>Reset Password Screen</Text>
      </View>
    ),
  };
});

jest.mock('../../src/screens/SignupPendingScreen', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID='signup-pending-screen'>
        <Text>Check your email</Text>
      </View>
    ),
  };
});

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFeatureFlags as jest.Mock).mockReturnValue({
      showNativeHeader: false,
    });
  });

  it('renders navigation container', async () => {
    const { getByTestId } = render(<AppNavigator />);
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
  });

  it('configures navigation with feature flags', async () => {
    (useFeatureFlags as jest.Mock).mockReturnValue({
      showNativeHeader: true,
    });

    const { getByTestId } = render(<AppNavigator />);
    await waitFor(() => expect(getByTestId('home-screen')).toBeTruthy());
  });

  it('throws when postLoginPathMobile is not registered', () => {
    resetAdopterConfigForTests();
    configureAdopter({
      ...adopterConfig,
      postLoginPathMobile: 'MissingScreen',
    });

    expect(() => render(<AppNavigator />)).toThrow(
      /postLoginPathMobile "MissingScreen" is not registered/
    );
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
