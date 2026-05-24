import React from 'react';
import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { resolveAdopterRouteAuth } from '@beakerstack/shared/navigation/adopterExtensions';
import { adopterStackScreens } from '@adopter/mobile/screenExtensions';
import { appIdentity } from '@adopter/config/app-identity';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
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
  prefixes: [`${appIdentity.deepLinkScheme}://`],
  config: {
    screens: {
      AuthCallback: 'auth/callback',
    },
  },
};

function validatePostLoginPathMobile() {
  const config = getAdopterConfig();
  const registered = new Set(adopterStackScreens.map(screen => screen.name));
  if (!registered.has(config.postLoginPathMobile)) {
    throw new Error(
      `postLoginPathMobile "${config.postLoginPathMobile}" is not registered in adopter/mobile/screenExtensions.tsx`
    );
  }
}

export { validatePostLoginPathMobile };

export const AppNavigator = () => {
  const { showNativeHeader } = useFeatureFlags();

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
        <Stack.Screen name='ForgotPassword' component={ForgotPasswordScreen} />
        <Stack.Screen name='AuthCallback' component={AuthCallbackScreen} />
        <Stack.Screen name='ResetPassword' component={ResetPasswordScreen} />
        {adopterStackScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name as keyof RootStackParamList}
            component={screen.component}
            options={
              resolveAdopterRouteAuth(screen.auth) === 'protected'
                ? undefined
                : { headerShown: false }
            }
          />
        ))}
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
