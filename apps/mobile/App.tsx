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
    // CRITICAL: Log immediately to verify this code is running
    // This will help us determine if the OTA update is loading at all
    const logMessage = '[App] ⚠️⚠️⚠️ APP.TSX USEEFFECT RUNNING ⚠️⚠️⚠️';
    console.log(logMessage);
    console.error(logMessage); // Use error level so it's more visible
    Logger.error(logMessage); // Also use Logger.error for native logs
    
    // Expose Constants globally for debugging in Chrome Console (after app loads)
    try {
      if (typeof global !== 'undefined' && Constants) {
        (global as any).__EXPO_CONSTANTS__ = Constants;
      }
    } catch (e) {
      // Ignore errors exposing Constants
    }
    
    // Log that useEffect is running (helps debug OTA update issues)
    // Using console.log so it's visible in Chrome DevTools Console tab
    console.log('[App] useEffect running - initializing Google Sign-In config');
    Logger.info('[App] useEffect running - initializing Google Sign-In config');
    
    // Log OTA update info to see which channel the build is using
    // Use both console.log (for Chrome DevTools) and Logger (for native logs)
    if (Updates.isEnabled) {
      const updateInfo = {
        enabled: true,
        channel: Updates.channel,
        updateId: Updates.updateId,
        manifestId: Updates.manifest?.id,
        runtimeVersion: Updates.runtimeVersion,
      };
      const updateLog = `[App] OTA Updates ENABLED - Channel: ${Updates.channel}, Update ID: ${Updates.updateId}`;
      console.log('[App] ========================================');
      console.log('[App] OTA Updates ENABLED');
      console.log('[App] Channel:', Updates.channel);
      console.log('[App] Update ID:', Updates.updateId);
      console.log('[App] Runtime Version:', Updates.runtimeVersion);
      console.log('[App] Manifest ID:', Updates.manifest?.id);
      console.log('[App] ========================================');
      console.error(updateLog); // Use error level for visibility
      Logger.error(updateLog);
      Logger.info('[App] OTA Update info:', updateInfo);
    } else {
      const disabledLog = '[App] OTA Updates DISABLED (using local bundle)';
      console.log('[App] ========================================');
      console.log(disabledLog);
      console.log('[App] ========================================');
      console.error(disabledLog); // Use error level for visibility
      Logger.error(disabledLog);
      Logger.info('[App] OTA Updates disabled (using local bundle)');
    }
    
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
    console.log('[App] extra object:', extra);
    console.log('[App] extra keys:', Object.keys(extra || {}));
    console.log('[App] raw googleWebClientId:', extra?.googleWebClientId);
    console.log('[App] raw googleIosClientId:', extra?.googleIosClientId);
    console.log('[App] raw googleAndroidClientId:', extra?.googleAndroidClientId);
    
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
    console.log('[App] Google Sign-In config:', JSON.stringify(configInfo, null, 2));
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
