import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';

interface SocialLoginButtonProps {
  provider: 'google' | 'apple';
  onPress: (provider: 'google' | 'apple') => Promise<void>;
  mode?: 'signin' | 'signup';
}

export function SocialLoginButton({
  provider,
  onPress,
  mode = 'signin',
}: SocialLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await onPress(provider);
    } catch (error) {
      console.warn(`${provider} OAuth error:`, error);
      // Error is already handled by useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const providerConfig = {
    google: {
      name: 'Google',
      backgroundColor: '#ffffff',
      textColor: '#374151',
      borderColor: '#d1d5db',
      // Using emoji as placeholder for icon
      icon: '🔍',
    },
    apple: {
      name: 'Apple',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      borderColor: '#000000',
      // Using emoji as placeholder for icon
      icon: '',
    },
  };

  const config = providerConfig[provider];
  const actionText = mode === 'signin' ? 'Sign in' : 'Sign up';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
        isLoading && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={config.textColor} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.icon, { color: config.textColor }]}>
            {config.icon}
          </Text>
          <Text style={[styles.text, { color: config.textColor }]}>
            {actionText} with {config.name}
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
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});

