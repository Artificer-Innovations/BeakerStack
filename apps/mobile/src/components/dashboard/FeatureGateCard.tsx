import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlan } from '@beakerstack/billing';
import { FeatureGate } from '@beakerstack/billing/native';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import { LucideLockIcon } from './LucideLockIcon';

export function FeatureGateCard() {
  const { loading: planLoading } = usePlan<typeof beakerstackBillingConfig>();

  return (
    <View>
      <Text style={styles.heading}>
        Feature A <Text style={styles.headingMuted}>(Pro+)</Text>
      </Text>
      {planLoading ? (
        <Text style={styles.muted}>…</Text>
      ) : (
        <FeatureGate<typeof beakerstackBillingConfig>
          feature='feature_a'
          fallback={
            <View style={styles.fallbackBox}>
              <View style={styles.lockCircle}>
                <LucideLockIcon size={16} color='#9333ea' />
              </View>
              <View style={styles.fallbackTextWrap}>
                <Text style={styles.fallbackTitle}>
                  Feature A is locked on your current plan
                </Text>
                <Text style={styles.fallbackBody}>
                  <Text style={styles.monoSm}>
                    useFeature(&quot;feature_a&quot;).enabled
                  </Text>{' '}
                  returns <Text style={styles.monoSm}>false</Text> on your plan
                  — <Text style={styles.monoSm}>FeatureGate</Text> renders this
                  fallback instead of children.
                </Text>
              </View>
            </View>
          }
        >
          <View style={styles.successBox}>
            <Text style={styles.checkGlyph}>✓</Text>
            <View>
              <Text style={styles.successTitle}>Feature A is active</Text>
              <Text style={styles.successSub}>
                <Text style={styles.monoSm}>
                  useFeature(&quot;feature_a&quot;).enabled
                </Text>
                {' → '}
                <Text style={styles.monoSm}>true</Text> ·{' '}
                <Text style={styles.monoSm}>FeatureGate</Text> renders children
              </Text>
            </View>
          </View>
        </FeatureGate>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  headingMuted: { fontWeight: '400', color: '#6b7280' },
  muted: { fontSize: 13, color: '#6b7280' },
  fallbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    padding: 14,
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTextWrap: { flex: 1, minWidth: 0 },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  fallbackBody: {
    marginTop: 4,
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
  },
  monoSm: { fontFamily: 'monospace', fontSize: 11, color: '#374151' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 14,
  },
  checkGlyph: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: -2,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  successSub: {
    marginTop: 4,
    fontSize: 11,
    color: '#15803d',
    lineHeight: 16,
  },
});
