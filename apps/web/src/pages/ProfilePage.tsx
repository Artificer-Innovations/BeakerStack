import { useState } from 'react';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@shared/components/navigation/AppHeader.web';
// Import Profile Display Components - Vite will automatically resolve .web.tsx files
import { ProfileHeader } from '@shared/components/profile/ProfileHeader.web';
import { ProfileStats } from '@shared/components/profile/ProfileStats.web';
// Import ProfileEditor - Vite will automatically resolve .web.tsx file
import { ProfileEditor } from '@shared/components/profile/ProfileEditor.web';
import { Logger } from '@shared/utils/logger';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const auth = useAuthContext();
  const profile = useProfile(supabase, auth.user);

  return (
    <div className='min-h-screen bg-gray-50'>
      <AppHeader supabaseClient={supabase} />

      {/* Main Content */}
      <div className='max-w-[800px] mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          {/* Loading State */}
          {profile.loading && (
            <div className='text-center py-12'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
              <p className='mt-4 text-gray-600'>Loading profile...</p>
            </div>
          )}

          {/* Error State */}
          {profile.error && !profile.loading && (
            <div className='rounded-md bg-red-50 p-4 mb-6'>
              <div className='flex'>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800'>
                    Error loading profile
                  </h3>
                  <p className='mt-2 text-sm text-red-700'>
                    {profile.error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          {!profile.loading && (
            <div className='space-y-6'>
              {/* Profile Header Section */}
              <div className='bg-white shadow rounded-lg p-6'>
                <ProfileHeader
                  profile={profile.profile}
                  email={auth.user?.email}
                />
              </div>

              {/* Profile Stats Section */}
              {profile.profile && (
                <div className='bg-white shadow rounded-lg p-6'>
                  <ProfileStats profile={profile.profile} />
                </div>
              )}

              {/* Profile Editor Section */}
              {!isEditing && (
                <div className='bg-white shadow rounded-lg p-6'>
                  <button
                    onClick={() => setIsEditing(true)}
                    className='w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              {isEditing && (
                <div className='bg-white shadow rounded-lg p-6'>
                  <ProfileEditor
                    supabaseClient={supabase}
                    user={auth.user}
                    onSuccess={() => {
                      // Refresh profile data after successful update
                      profile.refreshProfile();
                      setIsEditing(false);
                    }}
                    onError={error => {
                      Logger.error('Profile save error:', error);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
