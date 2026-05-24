import { configureAdopter } from '@beakerstack/shared/config/adopterRuntime';
import { adopterConfig } from '@adopter/config';
import { billingConfig } from '@adopter/config/billing';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { ObservabilityProvider } from '@beakerstack/observability/native';
import { BillingProvider } from '@beakerstack/billing';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
// Import from native-specific file for correct types
import { configureGoogleSignIn } from '@beakerstack/shared/hooks/useAuth.native';
import { Logger } from '@beakerstack/logger';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { ObservabilityUserSync } from './src/components/ObservabilityUserSync';

configureAdopter(adopterConfig);
import { beakerstackObservabilityConfig } from './src/config/observability';
import { getMobileBillingProviderUrls } from './src/billing/mobileBillingUrls';
import { supabase } from './src/lib/supabase';
import {
  AppNavigator,
  validatePostLoginPathMobile,
} from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';

validatePostLoginPathMobile();

const mobileBillingUrls = getMobileBillingProviderUrls();

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
    <ObservabilityProvider
      config={beakerstackObservabilityConfig}
      navigationRef={navigationRef}
    >
      <AppErrorBoundary>
        <AuthProvider supabaseClient={supabase}>
          <ObservabilityUserSync />
          <ProfileProvider supabaseClient={supabase}>
            <BillingProvider<typeof billingConfig>
              supabase={supabase}
              config={billingConfig}
              checkoutSuccessUrl={mobileBillingUrls.checkoutSuccessUrl}
              checkoutCancelUrl={mobileBillingUrls.checkoutCancelUrl}
              portalReturnUrl={mobileBillingUrls.portalReturnUrl}
            >
              <AppNavigator />
              <StatusBar style='auto' />
            </BillingProvider>
          </ProfileProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </ObservabilityProvider>
  );
}
