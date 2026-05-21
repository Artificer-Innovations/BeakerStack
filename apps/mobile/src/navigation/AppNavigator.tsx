import React from 'react';
import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BillingNavigator from '../navigation/BillingNavigator';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SignupPendingScreen from '../screens/SignupPendingScreen';
import { useFeatureFlags } from '../config/featureFlags';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

export type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['beaker-stack://'],
  config: {
    screens: {
      AuthCallback: 'auth/callback',
    },
  },
};

export const AppNavigator = () => {
  const { showNativeHeader } = useFeatureFlags();

  // Expose navigation to global scope for debugging (dev only)
  if (__DEV__ && typeof global !== 'undefined') {
    React.useEffect(() => {
      (global as { navigationRef?: typeof navigationRef }).navigationRef =
        navigationRef;
    }, []);
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
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
        <Stack.Screen name='ForgotPassword' component={ForgotPasswordScreen} />
        <Stack.Screen name='AuthCallback' component={AuthCallbackScreen} />
        <Stack.Screen name='ResetPassword' component={ResetPasswordScreen} />
        <Stack.Screen name='Dashboard' component={DashboardScreen} />
        <Stack.Screen name='Profile' component={ProfileScreen} />
        <Stack.Screen
          name='Billing'
          component={BillingNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name='SignupPending'
          component={SignupPendingScreen}
          options={{ title: 'Confirm your email' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
