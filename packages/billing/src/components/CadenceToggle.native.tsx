import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  cadenceAnnualSavingsFromPlans,
  formatCadenceToggleSavingsBadge,
} from '../presentation/billingSyncDisplay.js';
import { billingUi } from './billingUiTokens.js';
import type { CadenceToggleProps } from './CadenceToggle.types.js';

/**
 * Monthly / annual cadence pill (parity with web `CadenceToggle.web`).
 * Controlled via `cadence` + `onCadenceChange`.
 */
export function CadenceToggle({
  cadence,
  onCadenceChange,
  plans,
  style,
}: CadenceToggleProps): ReactElement {
  const savings = useMemo(() => cadenceAnnualSavingsFromPlans(plans), [plans]);
  const annualBadgeText = useMemo(
    () => formatCadenceToggleSavingsBadge(savings),
    [savings]
  );
  const isMonthly = cadence === 'monthly';
  const isAnnual = cadence === 'annual';

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.track}>
        <Pressable
          onPress={() => onCadenceChange('monthly')}
          style={[styles.segment, isMonthly && styles.segmentSelected]}
          accessibilityRole='button'
          accessibilityState={{ selected: isMonthly }}
        >
          <Text
            style={[
              styles.segmentLabel,
              isMonthly && styles.segmentLabelSelected,
            ]}
          >
            Monthly
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onCadenceChange('annual')}
          style={[styles.annualSegment, isAnnual && styles.segmentSelected]}
          accessibilityRole='button'
          accessibilityState={{ selected: isAnnual }}
          accessibilityLabel={
            annualBadgeText ? `Annually, ${annualBadgeText}` : 'Annually'
          }
        >
          <Text
            style={[
              styles.segmentLabel,
              isAnnual && styles.segmentLabelSelected,
            ]}
          >
            Annually
          </Text>
          {annualBadgeText ? (
            <View
              style={[
                styles.savingsBadge,
                isAnnual
                  ? styles.savingsBadgeOnSelected
                  : styles.savingsBadgeOnUnselected,
              ]}
            >
              <Text style={styles.savingsBadgeText}>{annualBadgeText}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: billingUi.gray200,
    backgroundColor: billingUi.white,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segment: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  annualSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
  },
  segmentSelected: {
    backgroundColor: billingUi.indigo600,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: billingUi.gray600,
  },
  segmentLabelSelected: {
    color: billingUi.white,
  },
  savingsBadge: {
    marginLeft: 8,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  savingsBadgeOnUnselected: {
    borderColor: billingUi.amber600,
    backgroundColor: billingUi.amber400,
  },
  savingsBadgeOnSelected: {
    borderColor: '#fbbf24',
    backgroundColor: billingUi.amber200,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: billingUi.amber950,
  },
});
