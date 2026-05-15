import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { supabase } from './lib/supabase';

/**
 * Auth + profile providers and any route that needs Supabase session state.
 * Loaded lazily from {@link App} so marketing/public routes avoid supabase-vendor.
 */
export default function AuthenticatedApp() {
  return (
    <AuthProvider supabaseClient={supabase}>
      <ProfileProvider supabaseClient={supabase}>
        <Outlet />
      </ProfileProvider>
    </AuthProvider>
  );
}
