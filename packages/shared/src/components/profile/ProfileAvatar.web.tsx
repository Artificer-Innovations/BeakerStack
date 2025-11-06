import type { UserProfile } from '../../types/profile';

export interface ProfileAvatarProps {
  profile: UserProfile | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * ProfileAvatar component for web
 * Displays user avatar with fallback to initials
 */
export function ProfileAvatar({ profile, size = 'medium', className = '' }: ProfileAvatarProps) {
  const sizeClasses = {
    small: 'w-12 h-12 text-sm',
    medium: 'w-20 h-20 text-lg',
    large: 'w-32 h-32 text-2xl',
  };

  const getInitials = (): string => {
    if (profile?.display_name) {
      const names = profile.display_name.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    return '?';
  };

  const avatarUrl = profile?.avatar_url;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={profile?.display_name || profile?.username || 'User avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<div class="${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">${getInitials()}</div>`;
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold ${className}`}
      role="img"
      aria-label={`Avatar for ${profile?.display_name || profile?.username || 'user'}`}
    >
      {getInitials()}
    </div>
  );
}

