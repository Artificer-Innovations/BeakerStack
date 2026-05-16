import { useState } from 'react';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
// Import Profile Display Components - Vite will automatically resolve .web.tsx files
import { ProfileHeader } from '@beakerstack/shared/components/profile/ProfileHeader.web';
import { ProfileStats } from '@beakerstack/shared/components/profile/ProfileStats.web';
// Import ProfileEditor - Vite will automatically resolve .web.tsx file
import { ProfileEditor } from '@beakerstack/shared/components/profile/ProfileEditor.web';
import { Logger } from '@beakerstack/shared/utils/logger';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const auth = useAuthContext();
  const profile = useProfileContext();

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />

      {/* Main Content */}
      <ContentContainer className='py-6'>
        <div>
          {/* Loading State */}
          {profile.loading && (
            <div className='text-center py-12'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
              <p className='mt-4 text-gray-600 dark:text-gray-400'>
                Loading profile...
              </p>
            </div>
          )}

          {/* Error State */}
          {profile.error && !profile.loading && (
            <div className='rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-6'>
              <div className='flex'>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-300'>
                    Error loading profile
                  </h3>
                  <p className='mt-2 text-sm text-red-700 dark:text-red-400'>
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
              <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
                <ProfileHeader
                  profile={profile.profile}
                  email={auth.user?.email}
                />
              </div>

              {/* Profile Stats Section */}
              {profile.profile && (
                <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
                  <ProfileStats profile={profile.profile} />
                </div>
              )}

              {/* Profile Editor Section */}
              {!isEditing && (
                <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
                  <button
                    onClick={() => setIsEditing(true)}
                    className='w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              {isEditing && (
                <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
                  <ProfileEditor
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
      </ContentContainer>
    </div>
  );
}
