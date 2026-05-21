import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@beakerstack/shared/theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignupPending'>;

export default function SignupPendingScreen({ route, navigation }: Props) {
  const email = route.params?.email ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.body}>
          We sent a confirmation link to{' '}
          <Text style={styles.emailHighlight}>{email}</Text>. Click the link in
          that email to finish creating your account.
        </Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Already confirmed? Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: colors.textSubtle,
    lineHeight: 22,
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 15,
    color: colors.brand,
    fontWeight: '500',
  },
});
