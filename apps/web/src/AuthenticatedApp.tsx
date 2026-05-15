import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { supabase } from './lib/supabase';

export function AuthenticatedApp() {
  return (
    <AuthProvider supabaseClient={supabase}>
      <ProfileProvider supabaseClient={supabase}>
        <Outlet />
      </ProfileProvider>
    </AuthProvider>
  );
}
