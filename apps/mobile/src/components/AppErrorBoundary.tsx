import type { ReactNode } from 'react';
import * as Updates from 'expo-updates';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary } from '@beakerstack/observability/native';

function AppErrorFallback() {
  const handleRetry = () => {
    void Updates.reloadAsync().catch(() => {
      // Dev client or unsupported — no hard failure for users without OTA.
    });
  };

  return (
    <View style={styles.container} accessibilityRole='alert'>
      <Text style={styles.title}>Something went wrong.</Text>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Try again'
        onPress={handleRetry}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 14,
    color: '#4f46e5',
  },
});

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>{children}</ErrorBoundary>
  );
}
