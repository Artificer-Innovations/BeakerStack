import { Link } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuthContext } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { UserMenu } from './UserMenu.web';
import { BRANDING } from '../../config/branding';

export interface AppHeaderProps {
  supabaseClient: SupabaseClient;
}

/**
 * AppHeader component for web
 * Displays app icon, title, and navigation based on auth state
 */
export function AppHeader({ supabaseClient: _supabaseClient }: AppHeaderProps) {
  const auth = useAuthContext();
  const profile = useProfileContext();

  return (
    <div className='bg-white shadow'>
      <div className='max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Left side: App icon and title */}
          <div className='flex items-center space-x-3'>
            <Link to='/' className='flex items-center'>
              <img
                src='/demo-flask-icon.svg'
                alt={BRANDING.displayName}
                className='w-8 h-8'
              />
            </Link>
            <Link
              to='/'
              className='text-xl font-semibold text-gray-900 hover:text-gray-700'
            >
              {BRANDING.displayName}
            </Link>
          </div>

          {/* Right side: Auth buttons or user menu */}
          <div className='flex items-center space-x-4'>
            {auth.user ? (
              <UserMenu user={auth.user} profile={profile.profile} />
            ) : (
              <>
                <Link
                  to='/login'
                  className='text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium'
                >
                  Sign In
                </Link>
                <Link
                  to='/signup'
                  className='bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700'
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
