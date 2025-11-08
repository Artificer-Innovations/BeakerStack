import { ProfileAvatar } from './ProfileAvatar.web';
import type { UserProfile } from '../../types/profile';

export interface ProfileHeaderProps {
  profile: UserProfile | null;
  email?: string | null;
  className?: string;
}

/**
 * ProfileHeader component for web
 * Displays user profile header with avatar, name, username, email, bio, location, and website
 */
export function ProfileHeader({ profile, email, className = '' }: ProfileHeaderProps) {
  if (!profile) {
    return (
      <div className={`rounded-md bg-gray-50 p-4 ${className}`}>
        <p className='text-sm text-gray-600'>No profile data available.</p>
      </div>
    );
  }

  const displayName =
    profile.display_name || profile.username || 'Anonymous User';
  const username = profile.username ? `@${profile.username}` : null;
  const hasMetadata = email || profile.location || profile.website;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className='flex items-start space-x-4'>
        <ProfileAvatar profile={profile} size='large' />
        <div className='flex-1 min-w-0'>
          <h2 className='text-2xl font-bold text-gray-900 truncate'>
            {displayName}
          </h2>
          {username && <p className='text-sm text-gray-500 mt-1'>{username}</p>}
          {hasMetadata && (
            <div className='flex flex-wrap gap-4 mt-2 text-sm text-gray-600'>
              {email && (
                <span className='flex items-center'>
                  <svg
                    className='w-4 h-4 mr-1'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                    />
                  </svg>
                  {email}
                </span>
              )}
              {profile.location && (
                <span className='flex items-center'>
                  <svg
                    className='w-4 h-4 mr-1'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                  </svg>
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center text-blue-600 hover:text-blue-800 hover:underline'
                >
                  <svg
                    className='w-4 h-4 mr-1'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
                    />
                  </svg>
                  {profile.website
                    .replace(/^https?:\/\//, '')
                    .replace(/\/$/, '')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {profile.bio && (
        <p className='text-gray-700 whitespace-pre-wrap'>{profile.bio}</p>
      )}
    </div>
  );
}
