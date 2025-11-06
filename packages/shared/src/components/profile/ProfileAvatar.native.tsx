import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import type { UserProfile } from '../../types/profile';

export interface ProfileAvatarProps {
  profile: UserProfile | null;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const sizeMap = {
  small: { size: 48, fontSize: 14 },
  medium: { size: 80, fontSize: 18 },
  large: { size: 128, fontSize: 24 },
};

/**
 * ProfileAvatar component for React Native
 * Displays user avatar with fallback to initials
 */
export function ProfileAvatar({ profile, size = 'medium', style }: ProfileAvatarProps) {
  const { size: avatarSize, fontSize } = sizeMap[size];

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
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
          style,
        ]}
        onError={() => {
          // Image failed to load - fallback handled by showing initials below
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#e5e7eb',
  },
  placeholder: {
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#4b5563',
    fontWeight: '600',
  },
});

