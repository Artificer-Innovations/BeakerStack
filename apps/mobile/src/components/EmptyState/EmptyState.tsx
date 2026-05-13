import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  title: string;
  description: string;
  illustration?: ImageSourcePropType;
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
}

export function EmptyState({ title, description, illustration, action }: Props) {
  return (
    <View style={styles.container}>
      {illustration && (
        <Image
          source={illustration}
          style={styles.illustration}
          accessibilityRole="none"
          accessible={false}
        />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && (
        <TouchableOpacity
          style={styles.button}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  illustration: { width: 120, height: 120, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
