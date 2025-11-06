import type { UserProfile } from '../../types/profile';

export interface ProfileStatsProps {
  profile: UserProfile | null;
  className?: string;
}

/**
 * ProfileStats component for web
 * Displays user profile statistics like member since date
 */
export function ProfileStats({ profile, className = '' }: ProfileStatsProps) {
  if (!profile) {
    return null;
  }

  const getMemberSinceDate = (): string | null => {
    if (!profile.created_at) {
      return null;
    }
    try {
      const date = new Date(profile.created_at);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return null;
    }
  };

  const getProfileCompletion = (): number => {
    const fields = [
      profile.display_name,
      profile.username,
      profile.bio,
      profile.avatar_url,
      profile.location,
      profile.website,
    ];
    const filledFields = fields.filter((field) => field !== null && field !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const memberSince = getMemberSinceDate();
  const completion = getProfileCompletion();

  if (!memberSince && completion === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {memberSince && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Member since:</span> {memberSince}
        </div>
      )}
      {completion > 0 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Profile completion:</span> {completion}%
        </div>
      )}
    </div>
  );
}

