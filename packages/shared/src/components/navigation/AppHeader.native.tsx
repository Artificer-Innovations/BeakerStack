import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SupabaseClient } from '@supabase/supabase-js';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { useAuthContext } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { UserMenu } from './UserMenu.native';
import { BRANDING } from '../../config/branding';

export interface AppHeaderProps {
  supabaseClient: SupabaseClient;
}

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * AppHeader component for React Native
 * Displays app icon, title, and navigation based on auth state
 */
export function AppHeader({ supabaseClient }: AppHeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const auth = useAuthContext();
  const profile = useProfile(supabaseClient, auth.user);

  // Get status bar height for Android
  const statusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={[styles.header, { paddingTop: statusBarHeight }]}>
      <View style={styles.headerContent}>
        {/* Left side: App icon and title */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.leftSection}
        >
          <View style={styles.iconContainer}>
            {/* @ts-expect-error - react-native-svg types have JSX compatibility issues in monorepo setup, but runtime works correctly */}
            <Svg width={32} height={32} viewBox='0 0 200 200'>
              {/* Background circle for app icon */}
              <Circle cx='100' cy='100' r='90' fill='#4F46E5' />

              {/* Erlenmeyer Flask outline */}
              <Path
                d='M 75 40 L 75 75 L 55 130 Q 50 145 55 155 Q 60 165 75 165 L 125 165 Q 140 165 145 155 Q 150 145 145 130 L 125 75 L 125 40 Z'
                fill='#E0E7FF'
                stroke='#8B5CF6'
                strokeWidth='3'
              />

              {/* Flask neck (darker for depth) */}
              <Rect x='75' y='40' width='50' height='8' fill='#C7D2FE' />

              {/* Liquid inside */}
              <Path
                d='M 60 140 Q 65 150 75 155 L 125 155 Q 135 150 140 140 L 127 80 L 73 80 Z'
                fill='#818CF8'
                opacity='0.7'
              />

              {/* Bubbles rising */}
              <Circle cx='85' cy='130' r='4' fill='#E0E7FF' opacity='0.8' />
              <Circle cx='95' cy='115' r='3' fill='#E0E7FF' opacity='0.9' />
              <Circle cx='105' cy='125' r='3.5' fill='#E0E7FF' opacity='0.85' />
              <Circle cx='90' cy='100' r='2.5' fill='#E0E7FF' opacity='0.95' />
              <Circle cx='110' cy='110' r='3' fill='#E0E7FF' opacity='0.9' />

              {/* Measurement lines on flask */}
              <Line
                x1='60'
                y1='120'
                x2='70'
                y2='120'
                stroke='#8B5CF6'
                strokeWidth='1.5'
                opacity='0.6'
              />
              <Line
                x1='60'
                y1='140'
                x2='70'
                y2='140'
                stroke='#8B5CF6'
                strokeWidth='1.5'
                opacity='0.6'
              />
              <Line
                x1='130'
                y1='120'
                x2='140'
                y2='120'
                stroke='#8B5CF6'
                strokeWidth='1.5'
                opacity='0.6'
              />
              <Line
                x1='130'
                y1='140'
                x2='140'
                y2='140'
                stroke='#8B5CF6'
                strokeWidth='1.5'
                opacity='0.6'
              />
            </Svg>
          </View>
          <Text style={styles.title}>{BRANDING.displayName}</Text>
        </TouchableOpacity>

        {/* Right side: Auth buttons or user menu */}
        <View style={styles.rightSection}>
          {auth.user ? (
            <UserMenu
              user={auth.user}
              profile={profile.profile}
              navigation={navigation}
            />
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
  );
}

const styles = StyleSheet.create({
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
});
