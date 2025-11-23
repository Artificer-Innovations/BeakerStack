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
    // Log that useEffect is running (helps debug OTA update issues)
    // Using console.log so it's visible in Chrome DevTools Console tab
    console.log('[App] useEffect running - initializing Google Sign-In config');
    Logger.info('[App] useEffect running - initializing Google Sign-In config');
    
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

    // Always log the config so we can debug OTA update issues
    // Using console.log so it's visible in Chrome DevTools Console tab
    const configInfo = {
      hasWebClientId: !!webClientId,
      hasIosClientId: !!iosClientId,
      hasAndroidClientId: !!androidClientId,
      webClientIdLength: webClientId?.length ?? 0,
      rawWebClientId: extra?.googleWebClientId,
      rawIosClientId: extra?.googleIosClientId,
      rawAndroidClientId: extra?.googleAndroidClientId,
      allExtraKeys: Object.keys(extra || {}),
      isDev: __DEV__,
      webClientIdPrefix: webClientId?.substring(0, 20) || 'undefined',
    };
    console.log('[App] Google Sign-In config:', configInfo);
    Logger.info('[App] Google Sign-In config:', configInfo);

    // Configure Google Sign-In asynchronously
    // The signInWithGoogle function will wait for this to complete
    configureGoogleSignIn({
      webClientId,
      iosClientId,
      androidClientId,
    }).catch(err => {
      console.warn('[App] Failed to configure Google Sign-In:', err);
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
