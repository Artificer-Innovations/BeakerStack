import { ReactNode, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../../contexts/AuthContext';
import { Logger } from '@beakerstack/logger';
import { colors } from '../../theme/colors';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: 'Login' | 'Signup' | 'Home';
}

/**
 * ProtectedRoute component for mobile (React Navigation)
 * Redirects unauthenticated users to the login screen
 */
export function ProtectedRoute({
  children,
  redirectTo = 'Login',
}: ProtectedRouteProps) {
  const auth = useAuthContext();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  useEffect(() => {
    // Redirect to login if not authenticated (after loading completes)
    // Add small delay to ensure navigation context is fully initialized
    if (!auth.loading && !auth.user && navigation) {
      const timer = setTimeout(() => {
        try {
          navigation.replace(redirectTo);
        } catch (error) {
          Logger.warn('[ProtectedRoute] Navigation error:', error);
        }
      }, 100); // Small delay to ensure navigation is ready

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [auth.loading, auth.user, navigation, redirectTo]);

  // Show loading state while checking authentication
  if (auth.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color={colors.brand} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show loading state while redirecting (to avoid blank screen)
  if (!auth.user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color={colors.brand} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // Render protected content if authenticated
  // Use View wrapper instead of fragment for better Android compatibility
  return <View style={{ flex: 1 }}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.pageBg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
});
