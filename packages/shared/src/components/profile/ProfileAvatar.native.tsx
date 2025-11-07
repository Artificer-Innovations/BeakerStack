import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle, TextStyle, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
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
  const [imageError, setImageError] = useState(false);
  const cacheBusterRef = useRef<string>('');

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

  // Reset error state and update cache buster when URL changes
  useEffect(() => {
    if (avatarUrl) {
      setImageError(false);
      // Update cache buster only when URL changes, not on every render
      cacheBusterRef.current = `t=${Date.now()}`;
    }
  }, [avatarUrl]);

  if (avatarUrl && !imageError) {
    // Fix URL for Android emulator - replace 127.0.0.1 with 10.0.2.2
    // Android emulators can't access host machine via 127.0.0.1
    let displayUrl = avatarUrl;
    
    // Extract base URL and query params separately
    const [baseUrl, existingParams] = displayUrl.split('?');
    
    if (Platform.OS === 'android' && __DEV__) {
      // Replace localhost with Android emulator's host machine IP
      displayUrl = baseUrl.replace('http://127.0.0.1:', 'http://10.0.2.2:');
      displayUrl = displayUrl.replace('http://localhost:', 'http://10.0.2.2:');
    }
    
    // Add cache-busting parameter to force refresh when URL changes
    // Use the ref value which only updates when avatarUrl changes
    const cacheBuster = cacheBusterRef.current || `t=${Date.now()}`;
    const finalUrl = existingParams 
      ? `${displayUrl}?${existingParams}&${cacheBuster}`
      : `${displayUrl}?${cacheBuster}`;

    return (
      <View
        key={avatarUrl} // Force re-render when URL changes
        style={[
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            overflow: 'hidden',
            backgroundColor: '#e5e7eb',
          },
          style,
        ]}
      >
        <Image
          key={finalUrl} // Force image reload when URL changes
          source={{ 
            uri: finalUrl,
            // Add headers for better compatibility
            headers: {
              'Accept': 'image/*',
            },
          }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
            },
          ]}
          resizeMode="cover"
          onError={(error) => {
            // Image failed to load - log for debugging and show fallback
            console.warn('[ProfileAvatar] Failed to load image:', finalUrl, error.nativeEvent?.error || error);
            setImageError(true);
          }}
          onLoad={() => {
            // Reset error on successful load
            setImageError(false);
          }}
        />
      </View>
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

