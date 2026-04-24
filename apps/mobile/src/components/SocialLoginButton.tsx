import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Logger } from '@beakerstack/shared/utils/logger';

interface SocialLoginButtonProps {
  onPress: () => Promise<void>;
  mode?: 'signin' | 'signup';
}

export function SocialLoginButton({
  onPress,
  mode = 'signin',
}: SocialLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await onPress();
    } catch (error) {
      // Error is already handled by useAuth hook - this is just for local debugging
      Logger.debug('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const actionText = mode === 'signin' ? 'Sign in' : 'Sign up';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles.googleButton,
        isLoading && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color='#374151' />
      ) : (
        <View style={styles.content}>
          <Svg width={20} height={20} viewBox='0 0 24 24' style={styles.icon}>
            <Path
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              fill='#4285F4'
            />
            <Path
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              fill='#34A853'
            />
            <Path
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              fill='#FBBC05'
            />
            <Path
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              fill='#EA4335'
            />
          </Svg>
          <Text style={[styles.text, styles.googleText]}>
            {actionText} with Google
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 48,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 20,
    height: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  googleText: {
    color: '#374151',
  },
});
