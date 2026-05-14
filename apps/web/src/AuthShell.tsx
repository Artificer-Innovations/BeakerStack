import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { supabase } from './lib/supabase';
import App from './App';

interface AuthShellProps {
  basePath: string;
}

export function AuthShell({ basePath }: AuthShellProps) {
  return (
    <AuthProvider supabaseClient={supabase}>
      <ProfileProvider supabaseClient={supabase}>
        <BrowserRouter basename={basePath}>
          <App />
        </BrowserRouter>
      </ProfileProvider>
    </AuthProvider>
  );
}
