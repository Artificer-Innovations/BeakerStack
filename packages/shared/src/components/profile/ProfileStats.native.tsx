import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { UserProfile } from '../../types/profile';

export interface ProfileStatsProps {
  profile: UserProfile | null;
  style?: ViewStyle;
}

/**
 * ProfileStats component for React Native
 * Displays user profile statistics like member since date
 */
export function ProfileStats({ profile, style }: ProfileStatsProps) {
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
    <View style={[styles.container, style]}>
      {memberSince && (
        <Text style={styles.stat}>
          <Text style={styles.label}>Member since: </Text>
          {memberSince}
        </Text>
      )}
      {completion > 0 && (
        <Text style={styles.stat}>
          <Text style={styles.label}>Profile completion: </Text>
          {completion}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  stat: {
    fontSize: 14,
    color: '#6b7280',
  },
  label: {
    fontWeight: '600',
  },
});

