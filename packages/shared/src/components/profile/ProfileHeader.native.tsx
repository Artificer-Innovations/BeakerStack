import { View, Text, StyleSheet, ViewStyle, Linking } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar.native';
import type { UserProfile } from '../../types/profile';
import { Logger } from '../../utils/logger';

export interface ProfileHeaderProps {
  profile: UserProfile | null;
  email?: string | null;
  style?: ViewStyle;
}

/**
 * ProfileHeader component for React Native
 * Displays user profile header with avatar, name, username, email, bio, location, and website
 */
export function ProfileHeader({ profile, email, style }: ProfileHeaderProps) {
  if (!profile) {
    return (
      <View style={[styles.container, styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>No profile data available.</Text>
      </View>
    );
  }

  const displayName =
    profile.display_name || profile.username || 'Anonymous User';
  const username = profile.username ? `@${profile.username}` : null;
  const hasMetadata = email || profile.location || profile.website;

  const handleWebsitePress = () => {
    if (profile.website) {
      Linking.openURL(profile.website).catch(err => {
        Logger.warn('Failed to open website:', err);
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <ProfileAvatar profile={profile} size='large' />
        <View style={styles.infoContainer}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {username && (
            <Text style={styles.username} numberOfLines={1}>
              {username}
            </Text>
          )}
          {hasMetadata && (
            <View style={styles.metaRow}>
              {email && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>✉️</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              )}
              {profile.location && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {profile.location}
                  </Text>
                </View>
              )}
              {profile.website && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>🔗</Text>
                  <Text
                    style={[styles.metaText, styles.link]}
                    onPress={handleWebsitePress}
                    numberOfLines={1}
                  >
                    {profile.website
                      .replace(/^https?:\/\//, '')
                      .replace(/\/$/, '')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    minWidth: 0,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#4b5563',
  },
  link: {
    color: '#2563eb',
  },
  bio: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});
