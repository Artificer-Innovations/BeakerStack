import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFeature } from '@beakerstack/billing';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';

interface TileProps {
  label: string;
  plan: string;
  enabled: boolean;
  loading: boolean;
  hookExpr: string;
}

function FeatureTile({ label, plan, enabled, loading, hookExpr }: TileProps) {
  return (
    <View style={[styles.tile, enabled ? styles.tileOn : styles.tileOff]}>
      <View style={styles.tileHeader}>
        <View>
          <Text style={styles.tileLabel}>{label}</Text>
          <Text style={styles.tilePlan}>{plan}</Text>
        </View>
        <View
          style={[styles.iconWrap, enabled ? styles.iconOn : styles.iconOff]}
        >
          {loading ? (
            <View style={styles.iconPlaceholder} />
          ) : (
            <Text style={[styles.iconText, enabled && styles.iconTextOn]}>
              {enabled ? '✓' : '✕'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>
          {hookExpr} →{' '}
          <Text style={enabled ? styles.codeValOn : styles.codeValOff}>
            {loading ? '…' : String(enabled)}
          </Text>
        </Text>
      </View>
    </View>
  );
}

export function BooleanFeatureTiles() {
  const featureA = useFeature<typeof beakerstackBillingConfig, 'feature_a'>(
    'feature_a'
  );
  const featureB = useFeature<typeof beakerstackBillingConfig, 'feature_b'>(
    'feature_b'
  );

  return (
    <View>
      <Text style={styles.sectionTitle}>Boolean feature gates</Text>
      <View style={styles.row}>
        <FeatureTile
          label='Feature A'
          plan='Requires Pro+'
          enabled={featureA.enabled}
          loading={featureA.loading}
          hookExpr='useFeature("feature_a").enabled'
        />
        <FeatureTile
          label='Feature B'
          plan='Requires Max'
          enabled={featureB.enabled}
          loading={featureB.loading}
          hookExpr='useFeature("feature_b").enabled'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 2,
    padding: 14,
  },
  tileOn: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  tileOff: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  tileLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  tilePlan: { marginTop: 2, fontSize: 11, color: '#6b7280' },
  iconWrap: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconOn: { backgroundColor: '#dcfce7' },
  iconOff: { backgroundColor: '#e5e7eb' },
  iconPlaceholder: { width: 14, height: 14 },
  iconText: { fontSize: 12, fontWeight: '800', color: '#9ca3af' },
  iconTextOn: { color: '#16a34a' },
  codeBox: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#cbd5e1',
  },
  codeValOn: { color: '#4ade80' },
  codeValOff: { color: '#64748b' },
});
