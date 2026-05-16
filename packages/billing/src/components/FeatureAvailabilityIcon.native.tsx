import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { billingUi } from './billingUiTokens.js';

/** Green checkmark (matches web lucide Check at ~16px). */
export function FeatureCheckIcon(): ReactElement {
  return (
    <View
      style={styles.iconBox}
      accessibilityElementsHidden
      importantForAccessibility='no'
    >
      <Text style={styles.check}>✓</Text>
    </View>
  );
}

/** Grey X (matches web lucide X at ~16px). */
export function FeatureXIcon(): ReactElement {
  return (
    <View
      style={styles.iconBox}
      accessibilityElementsHidden
      importantForAccessibility='no'
    >
      <Text style={styles.x}>✕</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 16,
    height: 16,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    color: billingUi.green600,
  },
  x: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
    color: billingUi.gray300,
  },
});
