import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
// Import from native-specific file for correct types
import { configureGoogleSignIn } from '@shared/hooks/useAuth.native';
import { Logger } from '@shared/utils/logger';
import { supabase } from './src/lib/supabase';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Expose Constants globally for debugging in Chrome Console (after app loads)
    try {
      if (typeof global !== 'undefined' && Constants) {
        (global as any).__EXPO_CONSTANTS__ = Constants;
      }
    } catch (e) {
      // Ignore errors exposing Constants
    }

    // Log OTA update status (meaningful startup info)
    if (Updates.isEnabled) {
      Logger.info('[App] OTA Updates enabled', {
        channel: Updates.channel || 'default',
        updateId: Updates.updateId,
        manifestId: Updates.manifest?.id,
        runtimeVersion: Updates.runtimeVersion,
      });
    } else {
      Logger.debug('[App] OTA Updates disabled (using local bundle)');
    }

    // Handle both expoConfig (SDK 49+) and manifest (older SDKs)
    const config = Constants.expoConfig ?? Constants.manifest;
    const extra = (
      config && 'extra' in config
        ? (config as { extra?: Record<string, unknown> }).extra
        : undefined
    ) as
      | {
          supabaseUrl?: string;
          supabaseAnonKey?: string;
          googleWebClientId?: string;
          googleIosClientId?: string;
          googleAndroidClientId?: string;
        }
      | undefined;

    // Log Supabase configuration (always, not just in dev) to help debug build issues
    if (extra?.supabaseUrl) {
      Logger.info('[App] Supabase URL from build config:', extra.supabaseUrl);
    } else {
      Logger.warn('[App] Supabase URL missing from build config');
    }

    // Filter out unsubstituted env var patterns (e.g., "${GOOGLE_SERVICES_WEB_CLIENT_ID}")
    const webClientId = extra?.googleWebClientId?.startsWith('${')
      ? undefined
      : extra?.googleWebClientId;
    const iosClientId = extra?.googleIosClientId?.startsWith('${')
      ? undefined
      : extra?.googleIosClientId;
    const androidClientId = extra?.googleAndroidClientId?.startsWith('${')
      ? undefined
      : extra?.googleAndroidClientId;

    // Log Google Sign-In configuration status (meaningful startup info)
    const hasAllClientIds = !!webClientId && !!iosClientId && !!androidClientId;
    if (hasAllClientIds) {
      Logger.info('[App] Google Sign-In configured', {
        hasWebClientId: !!webClientId,
        hasIosClientId: !!iosClientId,
        hasAndroidClientId: !!androidClientId,
      });
    } else {
      Logger.warn('[App] Google Sign-In missing client IDs', {
        hasWebClientId: !!webClientId,
        hasIosClientId: !!iosClientId,
        hasAndroidClientId: !!androidClientId,
      });
    }

    // Detailed config info for debugging (only in debug mode)
    if (__DEV__) {
      Logger.debug('[App] Google Sign-In config details', {
        webClientIdLength: webClientId?.length ?? 0,
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
      Logger.error('[App] Failed to configure Google Sign-In', err);
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
