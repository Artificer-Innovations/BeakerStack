import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import {
  DASHBOARD_TITLE,
  DASHBOARD_SUBTITLE,
} from '@beakerstack/shared/utils/strings';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;

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
  return <DashboardScreenContent navigation={navigation} />;
}

function DashboardScreenContent({ navigation: _navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader supabaseClient={supabase} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.dashboardArea}>
          <Text style={styles.title}>{DASHBOARD_TITLE}</Text>
          <Text style={styles.subtitle}>{DASHBOARD_SUBTITLE}</Text>
        </View>
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
  dashboardArea: {
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
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
});
