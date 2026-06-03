import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import { Logger } from '@beakerstack/logger';
import { colors } from '@beakerstack/shared/theme/colors';
import { supabase } from '../lib/supabase';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
// Import Profile Display Components - Metro will automatically resolve .native.tsx files
import { ProfileHeader } from '@beakerstack/shared/components/profile/ProfileHeader.native';
import { ProfileStats } from '@beakerstack/shared/components/profile/ProfileStats.native';
// ProfileEditor imported lazily to avoid StyleSheet.create() native bridge errors
// Dynamic import is used here, which is supported by Metro bundler
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Dynamic imports are supported by Metro, TypeScript error is a false positive
import type { ProfileEditorProps } from '@beakerstack/shared/components/profile/ProfileEditor.native';
import { loadProfileEditorModule } from './profileEditorLoader';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: Props) {
  const auth = useAuthContext();

  // Handle route protection - redirect if not authenticated
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      // Small delay to ensure navigation is ready
      const timer = setTimeout(() => {
        navigation.replace('Home');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [auth.loading, auth.user, navigation]);

  // Show loading state while checking authentication
  if (auth.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.brand} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show loading state while redirecting (to avoid blank screen)
  if (!auth.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.brand} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // Render protected content if authenticated
  return <ProfileScreenContent />;
}

function ProfileScreenContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [ProfileEditor, setProfileEditor] =
    useState<React.ComponentType<ProfileEditorProps> | null>(null);
  const auth = useAuthContext();
  const profile = useProfileContext();

  // Lazy load ProfileEditor only when editing
  useEffect(() => {
    if (isEditing && !ProfileEditor) {
      loadProfileEditorModule()
        .then(module => {
          setProfileEditor(() => module.ProfileEditor);
        })
        .catch(err => {
          Logger.error('[ProfileScreen] Failed to load ProfileEditor:', err);
        });
    }
  }, [isEditing, ProfileEditor]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader supabaseClient={supabase} />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Loading State */}
        {profile.loading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size='large' color={colors.brand} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        )}

        {/* Error State */}
        {profile.error && !profile.loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error loading profile</Text>
            <Text style={styles.errorMessage}>{profile.error.message}</Text>
          </View>
        )}

        {/* Profile Content */}
        {!profile.loading && (
          <View style={styles.profileContent}>
            {/* Profile Header Section */}
            <View style={styles.card}>
              <ProfileHeader
                profile={profile.profile}
                email={auth.user?.email}
              />
            </View>

            {/* Profile Stats Section */}
            {profile.profile && (
              <View style={styles.card}>
                <ProfileStats profile={profile.profile} />
              </View>
            )}

            {/* Profile Editor Section */}
            {!isEditing && (
              <View style={styles.card}>
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            )}

            {isEditing && (
              <View style={styles.card}>
                {ProfileEditor ? (
                  <ProfileEditor
                    onSuccess={() => {
                      // Refresh profile data after successful update
                      profile.refreshProfile();
                      setIsEditing(false);
                    }}
                    onError={(error: Error) => {
                      Logger.error('Profile save error:', error);
                    }}
                  />
                ) : (
                  <View style={styles.loadingSection}>
                    <ActivityIndicator size='small' color={colors.brand} />
                    <Text style={styles.loadingText}>Loading editor...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.pageBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.errorText,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.errorTextAlt,
  },
  profileContent: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editButton: {
    backgroundColor: colors.brand,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
