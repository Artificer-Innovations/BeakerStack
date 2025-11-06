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
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '../lib/supabase';
// Import Profile Display Components - Metro will automatically resolve .native.tsx files
import { ProfileHeader } from '@shared/components/profile/ProfileHeader.native';
import { ProfileStats } from '@shared/components/profile/ProfileStats.native';
// ProfileEditor imported lazily to avoid StyleSheet.create() native bridge errors
let ProfileEditor: any = null;

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

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
        navigation.replace('Login');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [auth.loading, auth.user, navigation]);

  // Show loading state while checking authentication
  if (auth.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show loading state while redirecting (to avoid blank screen)
  if (!auth.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // Render protected content if authenticated
  return <ProfileScreenContent navigation={navigation} />;
}

function ProfileScreenContent({ navigation }: Props) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const auth = useAuthContext();
  const profile = useProfile(supabase, auth.user);

  // Lazy load ProfileEditor only when this component mounts
  useEffect(() => {
    if (!componentsLoaded) {
      import('@shared/components/profile/ProfileEditor.native')
        .then((module) => {
          ProfileEditor = module.ProfileEditor;
          setComponentsLoaded(true);
        })
        .catch((err) => {
          console.warn('[ProfileScreen] Failed to load ProfileEditor:', err);
        });
    }
  }, [componentsLoaded]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            {auth.user && (
              <Text style={styles.userEmail}>{auth.user.email}</Text>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Dashboard')}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Loading State */}
        {profile.loading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#4F46E5" />
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
              <ProfileHeader profile={profile.profile} />
            </View>

            {/* Profile Stats Section */}
            {profile.profile && (
              <View style={styles.card}>
                <ProfileStats profile={profile.profile} />
              </View>
            )}

            {/* Profile Editor Section */}
            <View style={styles.card}>
              {profile.profile ? (
                <>
                  <Text style={styles.sectionTitle}>Edit Profile</Text>
                  {componentsLoaded && ProfileEditor ? (
                    <ProfileEditor
                      supabaseClient={supabase}
                      user={auth.user}
                      onSuccess={() => {
                        // Refresh profile data after successful update
                        profile.refreshProfile();
                      }}
                      onError={(error: Error) => {
                        console.error('Profile save error:', error);
                      }}
                    />
                  ) : (
                    <View style={styles.loadingSection}>
                      <ActivityIndicator size="small" color="#4F46E5" />
                      <Text style={styles.loadingText}>Loading editor...</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noProfileSection}>
                  <Text style={styles.noProfileText}>No profile found. Create one below.</Text>
                  {componentsLoaded && ProfileEditor ? (
                    <ProfileEditor
                      supabaseClient={supabase}
                      user={auth.user}
                      onSuccess={() => {
                        // Refresh profile data after successful creation
                        profile.refreshProfile();
                      }}
                      onError={(error: Error) => {
                        console.error('Profile creation error:', error);
                      }}
                    />
                  ) : (
                    <View style={styles.loadingSection}>
                      <ActivityIndicator size="small" color="#4F46E5" />
                      <Text style={styles.loadingText}>Loading editor...</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
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
  header: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noProfileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noProfileText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
});

