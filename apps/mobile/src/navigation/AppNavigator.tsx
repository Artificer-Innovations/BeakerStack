import React from 'react';
import {
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BillingScreen from '../screens/BillingScreen';
import { useFeatureFlags } from '../config/featureFlags';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useOnboardingGate } from '../hooks/useOnboardingGate';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Billing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthenticatedRoot({ userId }: { userId: string }) {
  const { showOnboarding, loading, markComplete } = useOnboardingGate(userId);
  const { showNativeHeader } = useFeatureFlags();

  if (loading) return null;
  if (showOnboarding) return <OnboardingScreen onComplete={markComplete} />;

  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: false, // Disable swipe-back gestures
        animation: 'none', // Disable screen transition animations
        headerShown: showNativeHeader, // Control native header visibility via feature flag
        headerBackVisible: showNativeHeader, // Control back button visibility
      }}
    >
      <Stack.Screen
        name='Home'
        component={HomeScreen}
        options={{ headerShown: false }} // Home always uses custom header
      />
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Signup' component={SignupScreen} />
      <Stack.Screen name='Dashboard' component={DashboardScreen} />
      <Stack.Screen name='Profile' component={ProfileScreen} />
      <Stack.Screen
        name='Billing'
        component={BillingScreen}
        options={{ title: 'Billing' }}
      />
    </Stack.Navigator>
  );
}

export const AppNavigator = () => {
  const navigationRef =
    React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { showNativeHeader } = useFeatureFlags();
  const auth = useAuthContext();

  // Expose navigation to global scope for debugging (dev only)
  if (__DEV__ && typeof global !== 'undefined') {
    React.useEffect(() => {
      (global as { navigationRef?: typeof navigationRef }).navigationRef =
        navigationRef;
    }, []);
  }

  const userId = auth.user?.id ?? null;

  return (
    <NavigationContainer ref={navigationRef}>
      {userId ? (
        <AuthenticatedRoot userId={userId} />
      ) : (
        <Stack.Navigator
          screenOptions={{
            gestureEnabled: false,
            animation: 'none',
            headerShown: showNativeHeader,
            headerBackVisible: showNativeHeader,
          }}
        >
          <Stack.Screen
            name='Home'
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name='Login' component={LoginScreen} />
          <Stack.Screen name='Signup' component={SignupScreen} />
          <Stack.Screen name='Dashboard' component={DashboardScreen} />
          <Stack.Screen name='Profile' component={ProfileScreen} />
          <Stack.Screen
            name='Billing'
            component={BillingScreen}
            options={{ title: 'Billing' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};
