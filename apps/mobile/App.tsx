import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { supabase } from './src/lib/supabase';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider supabaseClient={supabase}>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}