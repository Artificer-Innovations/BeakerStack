import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HOME_TITLE, HOME_SUBTITLE } from '@shared/utils/strings';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { DebugTools } from '../components/DebugTools';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.loading && auth.user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  }, [auth.loading, auth.user, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{HOME_TITLE}</Text>
          <View style={styles.headerActions}>
            {auth.user ? (
              <>
                <Text style={styles.userEmail}>{auth.user.email}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Dashboard')}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Signup')}
                  style={styles.headerButtonPrimary}
                >
                  <Text style={styles.headerButtonPrimaryText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{HOME_TITLE}</Text>
          <Text style={styles.subtitle}>
            {HOME_SUBTITLE}
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          {auth.user ? (
            // Signed in state
            <>
              <View style={styles.signedInContainer}>
                <Text style={styles.signedInText}>✓ Signed in as</Text>
                <Text style={styles.signedInEmail}>{auth.user.email}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.secondaryButtonText}>View Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Signed out state
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Signup')}
              >
                <Text style={styles.secondaryButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <DebugTools />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  headerButtonPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
  },
  headerButtonPrimaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  signedInContainer: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  signedInText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
  },
  signedInEmail: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});
