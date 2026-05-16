import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type TagVariant = 'usage' | 'gate' | 'feature';

const dotColor: Record<TagVariant, string> = {
  usage: '#fbbf24',
  gate: '#60a5fa',
  feature: '#4ade80',
};

interface AnnotatedPrimitiveProps {
  tag: string;
  variant: TagVariant;
  tooltip?: string;
  children: ReactNode;
}

export function AnnotatedPrimitive({
  tag,
  variant,
  tooltip,
  children,
}: AnnotatedPrimitiveProps) {
  const hint = tooltip ? `${tag} — ${tooltip}` : tag;
  return (
    <View style={styles.card} accessibilityHint={hint} accessibilityLabel={tag}>
      <View style={styles.tagRow}>
        <View
          style={[styles.dot, { backgroundColor: dotColor[variant] }]}
          accessibilityElementsHidden
        />
        <Text style={styles.tagText}>{tag}</Text>
      </View>
      {tooltip ? (
        <Text style={styles.tooltip} accessibilityRole='text'>
          {tooltip}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c4b5fd',
    padding: 16,
    paddingTop: 28,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  tagRow: {
    position: 'absolute',
    top: -10,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#e9d5ff',
  },
  tooltip: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  body: { marginTop: 8 },
});
