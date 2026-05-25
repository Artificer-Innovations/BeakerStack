import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../../types/profile';
import { useAuthContext } from '../../contexts/AuthContext';
import { ProfileAvatar } from '../profile/ProfileAvatar.native';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Billing: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface UserMenuProps {
  user: User;
  profile: UserProfile | null;
  navigation: NavigationProp;
}

/**
 * UserMenu component for React Native
 * Displays user avatar with dropdown menu containing Profile, Dashboard, and Sign Out options
 */
export function UserMenu({ user, profile, navigation }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const avatarRef = useRef<View>(null);
  const [avatarLayout, setAvatarLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const auth = useAuthContext();

  const handleCloseMenu = useCallback(() => setIsOpen(false), []);

  const handleDismissSignOut = useCallback(() => setIsOpen(false), []);

  const handleConfirmSignOut = useCallback(async () => {
    setIsOpen(false);
    await auth.signOut();
    navigation.navigate('Home');
  }, [auth, navigation]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel', onPress: handleDismissSignOut },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: handleConfirmSignOut,
      },
    ]);
  }, [handleConfirmSignOut, handleDismissSignOut]);

  const handleNavigate = useCallback(
    (route: 'Profile' | 'Dashboard' | 'Billing') => {
      setIsOpen(false);
      navigation.navigate(route);
    },
    [navigation]
  );

  const handleProfilePress = useCallback(
    () => handleNavigate('Profile'),
    [handleNavigate]
  );
  const handleBillingPress = useCallback(
    () => handleNavigate('Billing'),
    [handleNavigate]
  );
  const handleDashboardPress = useCallback(
    () => handleNavigate('Dashboard'),
    [handleNavigate]
  );

  const handleMenuResponder = useCallback(() => true, []);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    user.email?.split('@')[0] ||
    'User';

  const handleAvatarMeasured = useCallback(
    (
      _x: number,
      _y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number
    ) => {
      setAvatarLayout({ x: pageX, y: pageY, width, height });
      setIsOpen(open => !open);
    },
    []
  );

  const handleAvatarPress = useCallback(() => {
    if (avatarRef.current) {
      avatarRef.current.measure(handleAvatarMeasured);
    } else {
      setIsOpen(open => !open);
    }
  }, [handleAvatarMeasured]);

  return (
    <>
      <View style={styles.container}>
        <View ref={avatarRef} collapsable={false}>
          <TouchableOpacity
            accessibilityLabel='Open user menu'
            onPress={handleAvatarPress}
            style={styles.avatarButton}
            activeOpacity={0.7}
          >
            <ProfileAvatar profile={profile} size='small' />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType='fade'
        onRequestClose={handleCloseMenu}
      >
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.menuContainer,
                {
                  top: avatarLayout.y + avatarLayout.height + 8,
                  right:
                    Platform.OS === 'ios' ? /* v8 ignore next */ undefined : 16,
                  left:
                    Platform.OS === 'ios'
                      ? avatarLayout.x + avatarLayout.width - 224
                      : /* v8 ignore next */ undefined,
                },
              ]}
              onStartShouldSetResponder={handleMenuResponder}
            >
              {/* User name display */}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                {user.email && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
              </View>

              {/* Menu items */}
              <TouchableOpacity
                onPress={handleProfilePress}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBillingPress}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>Billing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDashboardPress}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                style={[styles.menuItem, styles.menuItemDanger]}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarButton: {
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    width: 224, // w-56 equivalent (14rem = 224px)
    backgroundColor: '#ffffff',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10, // Higher elevation for Android to ensure it's on top
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
  },
});
