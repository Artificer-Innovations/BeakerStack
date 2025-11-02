import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export default function DashboardScreen({ navigation }: Props) {
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
  return <DashboardScreenContent navigation={navigation} />;
}

function DashboardScreenContent({ navigation }: Props) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const auth = useAuthContext();
  
  // Manual test: useProfile hook for Task 4.1
  const profile = useProfile(supabase, auth.user);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await auth.signOut();
              navigation.navigate('Home');
            } catch (error) {
              Alert.alert(
                'Sign Out Failed',
                error instanceof Error ? error.message : 'Failed to sign out'
              );
            } finally {
              setIsSigningOut(false);
            }
          }
        },
      ]
    );
  };

  const handleCreateProfile = async () => {
    if (!auth.user) return;
    try {
      await profile.createProfile(auth.user.id, {
        username: `testuser_${Date.now()}`,
        display_name: 'Test User',
        bio: 'Created via useProfile hook test',
      });
      Alert.alert('Success', '✅ Profile created! Check the display above.');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.user) return;
    try {
      await profile.updateProfile(auth.user.id, {
        display_name: `Test User ${Date.now()}`,
      });
      Alert.alert('Success', '✅ Profile updated! Check the display above.');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      await profile.refreshProfile();
      Alert.alert('Success', '✅ Profile refreshed!');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to your Dashboard!</Text>
          {auth.user && (
            <Text style={styles.userEmail}>{auth.user.email}</Text>
          )}
          <Text style={styles.subtitle}>
            This is where your main application content will go.
          </Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dashboard Content</Text>
          <Text style={styles.cardText}>
            Your personalized dashboard will be implemented here with:
          </Text>
          <Text style={styles.cardText}>• User profile information</Text>
          <Text style={styles.cardText}>• Data visualization</Text>
          <Text style={styles.cardText}>• Navigation to other features</Text>
        </View>

        {/* Manual test display for useProfile hook - Task 4.1 */}
        <View style={styles.testCard}>
          <Text style={styles.testCardTitle}>🧪 useProfile Hook Test (Task 4.1)</Text>
          <View style={styles.testInfo}>
            <Text style={styles.testLabel}>Loading:</Text>
            <Text style={styles.testValue}>{profile.loading ? 'true' : 'false'}</Text>
          </View>
          <View style={styles.testInfo}>
            <Text style={styles.testLabel}>Profile:</Text>
            <Text style={styles.testValue}>{profile.profile ? 'exists' : 'null'}</Text>
          </View>
          <View style={styles.testInfo}>
            <Text style={styles.testLabel}>Error:</Text>
            <Text style={styles.testValue}>{profile.error ? profile.error.message : 'null'}</Text>
          </View>
          
          {profile.profile && (
            <View style={styles.profileDataContainer}>
              <Text style={styles.profileDataTitle}>Profile Data:</Text>
              <Text style={styles.profileDataText}>
                Username: {profile.profile.username || 'null'}
              </Text>
              <Text style={styles.profileDataText}>
                Display Name: {profile.profile.display_name || 'null'}
              </Text>
              <Text style={styles.profileDataText}>
                Bio: {profile.profile.bio || 'null'}
              </Text>
              <Text style={styles.profileDataText}>
                Location: {profile.profile.location || 'null'}
              </Text>
              <Text style={styles.profileDataText}>
                Website: {profile.profile.website || 'null'}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.testButton, profile.loading && styles.testButtonDisabled]}
            onPress={profile.profile ? handleUpdateProfile : handleCreateProfile}
            disabled={profile.loading || !auth.user}
          >
            <Text style={styles.testButtonText}>
              {profile.profile ? 'Update Profile' : 'Create Profile'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, profile.loading && styles.testButtonDisabled]}
            onPress={handleRefreshProfile}
            disabled={profile.loading || !auth.user}
          >
            <Text style={styles.testButtonText}>Refresh Profile</Text>
          </TouchableOpacity>
          
          <Text style={styles.testNote}>
            ✓ Test create, read, update operations above
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.signOutButton, isSigningOut && styles.signOutButtonDisabled]} 
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  signOutButtonDisabled: {
    opacity: 0.5,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  testCard: {
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 12,
  },
  testInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testLabel: {
    fontSize: 12,
    color: '#6b21a8',
    fontWeight: '500',
  },
  testValue: {
    fontSize: 12,
    color: '#6b21a8',
    fontFamily: 'monospace',
  },
  profileDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  profileDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 8,
  },
  profileDataText: {
    fontSize: 11,
    color: '#6b21a8',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#d8b4fe',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#6b21a8',
    fontSize: 14,
    fontWeight: '600',
  },
  testNote: {
    fontSize: 11,
    color: '#9333ea',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
