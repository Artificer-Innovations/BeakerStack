import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBillingConfig } from '../hooks/useBillingConfig.js';
import {
  mergePlanFeatureRows,
  planFeatureLine,
} from '../presentation/planPresentation.js';
import type { ProductBillingConfig } from '../schema.js';
import {
  FeatureCheckIcon,
  FeatureXIcon,
} from './FeatureAvailabilityIcon.native.js';
import { billingUi } from './billingUiTokens.js';
import type { PlanFeatureListProps } from './PlanFeatureList.types.js';

/**
 * “What’s included” list with green checks / grey X (parity with web `PlanFeatureList.web`).
 */
export function PlanFeatureList<P extends ProductBillingConfig>({
  plan,
  style,
}: PlanFeatureListProps<P>): ReactElement {
  const billingConfig = useBillingConfig<P>();
  const rows = mergePlanFeatureRows(billingConfig);

  return (
    <View style={style}>
      <Text style={styles.title}>What&apos;s included</Text>
      <View>
        {rows.map((row, index) => {
          const { ok, text } = planFeatureLine(plan, row);
          return (
            <View
              key={row.id}
              style={[styles.row, index < rows.length - 1 && styles.rowSpacing]}
            >
              {ok ? <FeatureCheckIcon /> : <FeatureXIcon />}
              <Text style={styles.rowText}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: billingUi.gray900,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowSpacing: {
    marginBottom: 6,
  },
  rowText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
    color: billingUi.gray600,
  },
});
