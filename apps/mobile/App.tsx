import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
// Import from native-specific file for correct types
import { configureGoogleSignIn } from '@shared/hooks/useAuth.native';
import { Logger } from '@shared/utils/logger';
import { supabase } from './src/lib/supabase';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Handle both expoConfig (SDK 49+) and manifest (older SDKs)
    const config = Constants.expoConfig ?? Constants.manifest;
    const extra = (
      config && 'extra' in config
        ? (config as { extra?: Record<string, unknown> }).extra
        : undefined
    ) as
      | {
          googleWebClientId?: string;
          googleIosClientId?: string;
          googleAndroidClientId?: string;
        }
      | undefined;

    // Filter out unsubstituted env var patterns (e.g., "${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID}")
    const webClientId = extra?.googleWebClientId?.startsWith('${')
      ? undefined
      : extra?.googleWebClientId;
    const iosClientId = extra?.googleIosClientId?.startsWith('${')
      ? undefined
      : extra?.googleIosClientId;
    const androidClientId = extra?.googleAndroidClientId?.startsWith('${')
      ? undefined
      : extra?.googleAndroidClientId;

    if (__DEV__) {
      Logger.debug('[App] Google Sign-In config:', {
        hasWebClientId: !!webClientId,
        hasIosClientId: !!iosClientId,
        hasAndroidClientId: !!androidClientId,
        webClientIdLength: webClientId?.length ?? 0,
        rawWebClientId: extra?.googleWebClientId,
        rawIosClientId: extra?.googleIosClientId,
        rawAndroidClientId: extra?.googleAndroidClientId,
        allExtraKeys: Object.keys(extra || {}),
      });
    }

    // Configure Google Sign-In asynchronously
    // The signInWithGoogle function will wait for this to complete
    configureGoogleSignIn({
      webClientId,
      iosClientId,
      androidClientId,
    }).catch(err => {
      Logger.warn('[App] Failed to configure Google Sign-In:', err);
    });
  }, []);

  return (
    <AuthProvider supabaseClient={supabase}>
      <ProfileProvider supabaseClient={supabase}>
        <AppNavigator />
        <StatusBar style='auto' />
      </ProfileProvider>
    </AuthProvider>
  );
}
