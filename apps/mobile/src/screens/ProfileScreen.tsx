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
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfileContext } from '@shared/contexts/ProfileContext';
import { Logger } from '@shared/utils/logger';
import { supabase } from '../lib/supabase';
import { AppHeader } from '@shared/components/navigation/AppHeader.native';
// Import Profile Display Components - Metro will automatically resolve .native.tsx files
import { ProfileHeader } from '@shared/components/profile/ProfileHeader.native';
import { ProfileStats } from '@shared/components/profile/ProfileStats.native';
// ProfileEditor imported lazily to avoid StyleSheet.create() native bridge errors
// Dynamic import is used here, which is supported by Metro bundler
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Dynamic imports are supported by Metro, TypeScript error is a false positive
import type { ProfileEditorProps } from '@shared/components/profile/ProfileEditor.native';
let ProfileEditor: React.ComponentType<ProfileEditorProps> | null = null;

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
        <ActivityIndicator size='large' color='#4F46E5' />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show loading state while redirecting (to avoid blank screen)
  if (!auth.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#4F46E5' />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // Render protected content if authenticated
  return <ProfileScreenContent navigation={navigation} />;
}

function ProfileScreenContent({ navigation: _navigation }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const auth = useAuthContext();
  const profile = useProfileContext();

  // Lazy load ProfileEditor only when editing
  useEffect(() => {
    if (isEditing && !componentsLoaded) {
      // Dynamic imports are supported by Metro bundler
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - TypeScript doesn't recognize dynamic imports but Metro supports them
      import('@shared/components/profile/ProfileEditor.native')
        .then(module => {
          ProfileEditor = module.ProfileEditor;
          setComponentsLoaded(true);
        })
        .catch(err => {
          Logger.error('[ProfileScreen] Failed to load ProfileEditor:', err);
        });
    }
  }, [isEditing, componentsLoaded]);

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
            <ActivityIndicator size='large' color='#4F46E5' />
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
                {componentsLoaded && ProfileEditor ? (
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
                    <ActivityIndicator size='small' color='#4F46E5' />
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
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
  },
  profileContent: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editButton: {
    backgroundColor: '#4F46E5',
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
