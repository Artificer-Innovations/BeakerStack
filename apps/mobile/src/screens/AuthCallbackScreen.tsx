import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@beakerstack/shared/theme/colors';
import { supabase } from '../lib/supabase';
import { type RootStackParamList } from '../navigation/AppNavigator';

type AuthCallbackScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AuthCallback'
>;

interface Props {
  navigation: AuthCallbackScreenNavigationProp;
}

export default function AuthCallbackScreen({ navigation }: Props) {
  const navigatedRef = useRef(false);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (navigatedRef.current) return;

      if (event === 'PASSWORD_RECOVERY') {
        navigatedRef.current = true;
        clearTimeout(fallbackTimer);
        navigation.reset({ index: 0, routes: [{ name: 'ResetPassword' }] });
      } else if (event === 'SIGNED_IN') {
        navigatedRef.current = true;
        clearTimeout(fallbackTimer);
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size='large' color={colors.brand} />
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
