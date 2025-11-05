import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { configureGoogleSignIn } from '@shared/hooks/useAuth';
import { supabase } from './src/lib/supabase';
import { AppNavigator } from './src/navigation/AppNavigator';


export default function App() {
  useEffect(() => {
    const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) as {
      googleWebClientId?: string;
      googleIosClientId?: string;
      googleAndroidClientId?: string;
    };
    
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
      console.log('[App] Google Sign-In config:', {
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
    
    configureGoogleSignIn({
      webClientId,
      iosClientId,
      androidClientId,
    });
  }, []);

  return (
    <AuthProvider supabaseClient={supabase}>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}