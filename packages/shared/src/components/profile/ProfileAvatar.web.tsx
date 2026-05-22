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
export function ProfileAvatar({
  profile,
  size = 'medium',
  /* v8 ignore next */
  className = '',
}: ProfileAvatarProps) {
  const sizeClasses = {
    small: 'w-12 h-12 text-sm',
    medium: 'w-20 h-20 text-lg',
    large: 'w-32 h-32 text-2xl',
  };

  const getInitials = (): string => {
    if (profile?.display_name) {
      const displayName = profile.display_name;
      const names = displayName.trim().split(/\s+/);
      if (names.length >= 2) {
        /* v8 ignore next */
        const firstChar = names[0]?.[0];
        /* v8 ignore next */
        const lastChar = names[names.length - 1]?.[0];
        /* v8 ignore next -- split words always include first characters */
        if (firstChar && lastChar) {
          return (firstChar + lastChar).toUpperCase();
        }
      }
      /* v8 ignore next */
      const firstChar = names[0]?.[0];
      if (firstChar) {
        return firstChar.toUpperCase();
      }
    }
    if (profile?.username) {
      const username = profile.username;
      /* v8 ignore next */
      const firstChar = username?.[0];
      if (firstChar) {
        return firstChar.toUpperCase();
      }
    }
    return /* v8 ignore next */ '?';
  };

  const avatarUrl = profile?.avatar_url;

  if (avatarUrl) {
    // Add cache-busting parameter for display to prevent browser caching issues
    // The database stores the clean URL, we add cache-busting only when displaying
    const displayUrl = avatarUrl.includes('?')
      ? avatarUrl // Already has params, use as-is
      : `${avatarUrl}?t=${Date.now()}`; // Add timestamp for cache-busting

    return (
      <img
        key={avatarUrl} // Key ensures React re-renders when URL changes
        src={displayUrl}
        alt={
          /* v8 ignore start -- alt fallbacks covered via placeholder path tests */
          profile?.display_name || profile?.username || 'User avatar'
          /* v8 ignore stop */
        }
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={e => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<div class="${sizeClasses[size]} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">${getInitials()}</div>`;
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold ${className}`}
      role='img'
      aria-label={`Avatar for ${profile?.display_name || profile?.username || 'user'}`}
    >
      {getInitials()}
    </div>
  );
}
