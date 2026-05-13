import React from 'react';
import {
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@beakerstack/shared';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BillingScreen from '../screens/BillingScreen';
import { useFeatureFlags } from '../config/featureFlags';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Billing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function withScreenBoundary(Component: React.ComponentType<any>) {
  return function BoundedScreen(props: any) {
    return (
      <ErrorBoundary level="screen">
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export const AppNavigator = () => {
  const navigationRef =
    React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { showNativeHeader } = useFeatureFlags();

  // Expose navigation to global scope for debugging (dev only)
  if (__DEV__ && typeof global !== 'undefined') {
    React.useEffect(() => {
      (global as { navigationRef?: typeof navigationRef }).navigationRef =
        navigationRef;
    }, []);
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
          component={withScreenBoundary(HomeScreen)}
          options={{ headerShown: false }} // Home always uses custom header
        />
        <Stack.Screen name='Login' component={withScreenBoundary(LoginScreen)} />
        <Stack.Screen name='Signup' component={withScreenBoundary(SignupScreen)} />
        <Stack.Screen name='Dashboard' component={withScreenBoundary(DashboardScreen)} />
        <Stack.Screen name='Profile' component={withScreenBoundary(ProfileScreen)} />
        <Stack.Screen
          name='Billing'
          component={withScreenBoundary(BillingScreen)}
          options={{ title: 'Billing' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
