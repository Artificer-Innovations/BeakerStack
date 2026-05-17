import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFeature } from '@beakerstack/billing';
import { colors } from '@beakerstack/shared/theme/colors';
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
    color: colors.textPrimary,
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
    borderColor: colors.featureOnBorder,
    backgroundColor: colors.featureOnBg,
  },
  tileOff: {
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  tileLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  tilePlan: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  iconWrap: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconOn: { backgroundColor: colors.featureOnIconBg },
  iconOff: { backgroundColor: colors.iconOffBg },
  iconPlaceholder: { width: 14, height: 14 },
  iconText: { fontSize: 12, fontWeight: '800', color: colors.textFaint },
  iconTextOn: { color: colors.featureOnIcon },
  codeBox: {
    marginTop: 10,
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.codeText,
  },
  codeValOn: { color: colors.codeValTrue },
  codeValOff: { color: colors.codeValFalse },
});
