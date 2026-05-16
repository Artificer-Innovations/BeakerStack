import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { UsageIndicator } from '@beakerstack/billing/native';
import {
  usePlan,
  useBillingState,
  useBillingConfig,
} from '@beakerstack/billing';
import {
  booleanFeatureLabel,
  mergeUsageLimitsCopy,
  mergeUsageMeterCopy,
} from '@beakerstack/billing/presentation';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { useDemoCollectionCount } from '../../billing/useDemoCollectionCount';
import { BillingLayout } from './BillingLayout';
import { billingColors, billingStyles } from './styles';

function FeatureLimitRow({
  name,
  used,
  cap,
  capIsUnlimited,
}: {
  name: string;
  used: number;
  cap: number;
  capIsUnlimited: boolean;
}) {
  const u = used ?? 0;
  if (capIsUnlimited) {
    return (
      <View style={billingStyles.rowBetween}>
        <Text style={{ color: billingColors.textPrimary }}>{name}</Text>
        <Text style={{ color: billingColors.textMuted }}>{u} of unlimited</Text>
      </View>
    );
  }
  const ratio = cap > 0 ? u / cap : 0;
  const heavy = ratio >= 0.8 && u < cap;
  const at = u >= cap;
  const rightColor = at
    ? '#b91c1c'
    : heavy
      ? '#b45309'
      : billingColors.textMuted;
  return (
    <View style={billingStyles.rowBetween}>
      <Text style={{ color: billingColors.textPrimary }}>{name}</Text>
      <Text style={{ color: rightColor }}>
        {u} of {cap}
      </Text>
    </View>
  );
}

function PlanFeatureRow({
  name,
  available,
}: {
  name: string;
  available: boolean;
}) {
  return (
    <View style={billingStyles.rowBetween}>
      <Text style={{ color: billingColors.textPrimary }}>
        {available ? '✓ ' : '✗ '}
        {name}
      </Text>
      <Text style={{ color: billingColors.textMuted }}>
        {available ? 'Available' : 'Not available'}
      </Text>
    </View>
  );
}

export function BillingUsageScreen(): ReactElement {
  const billingConfig = useBillingConfig<typeof beakerstackBillingConfig>();
  const meterCopy = mergeUsageMeterCopy(billingConfig);
  const limitsCopy = mergeUsageLimitsCopy(billingConfig);
  const featureALabel = booleanFeatureLabel(billingConfig, 'feature_a');
  const featureBLabel = booleanFeatureLabel(billingConfig, 'feature_b');
  const { data: plan } = usePlan<typeof beakerstackBillingConfig>();
  const { kind, subscription } =
    useBillingState<typeof beakerstackBillingConfig>();
  const { count: colCount = 0, maxItemsInAnyCollection = 0 } =
    useDemoCollectionCount();

  if (!plan) {
    return (
      <BillingLayout>
        <Text style={billingStyles.body}>Loading plan…</Text>
      </BillingLayout>
    );
  }
  const containers = plan.features.containers_per_account_max as number;
  const itemsCap = plan.features.items_per_container_max as number;

  return (
    <BillingLayout>
      {kind === 'payment_failed' ? (
        <View
          style={[
            billingStyles.card,
            {
              backgroundColor: billingColors.errorBg,
              borderColor: billingColors.errorBorder,
            },
          ]}
        >
          <Text style={{ color: billingColors.errorText }}>
            Payment failed. Limits may change if your plan lapses.
          </Text>
        </View>
      ) : null}
      <View style={billingStyles.card}>
        <Text style={billingStyles.body}>
          {subscription?.status === 'free' ||
          !subscription?.stripe_subscription_id
            ? 'Your usage resets at the start of the next calendar month (free tier).'
            : 'Your usage resets on your next billing date (see Usage below for the exact reset date for meters).'}
        </Text>
      </View>
      <View style={{ marginBottom: 8 }}>
        <Text style={billingStyles.sectionTitle}>Usage</Text>
        {Object.keys(plan.usage_limits).map(m => (
          <View key={m} style={{ marginTop: 12 }}>
            <UsageIndicator<typeof beakerstackBillingConfig>
              meter={m as typeof BEAKERSTACK_METER_AI_SUMMARIZE}
              variant='expanded'
              label={meterCopy[m]?.label ?? m}
              description={meterCopy[m]?.description}
            />
          </View>
        ))}
      </View>
      <View style={{ marginBottom: 8 }}>
        <Text style={billingStyles.sectionTitle}>Limits</Text>
        <View style={billingStyles.card}>
          <FeatureLimitRow
            name={limitsCopy.collectionsRowName}
            used={colCount}
            cap={containers === -1 ? 0 : containers}
            capIsUnlimited={containers === -1}
          />
          <FeatureLimitRow
            name={limitsCopy.itemsRowName}
            used={maxItemsInAnyCollection}
            cap={itemsCap === -1 ? 0 : itemsCap}
            capIsUnlimited={itemsCap === -1}
          />
          <Text style={[billingStyles.small, { marginTop: 8 }]}>
            {limitsCopy.collectionsFootnote}
          </Text>
        </View>
      </View>
      <View>
        <Text style={billingStyles.sectionTitle}>Plan features</Text>
        <View style={billingStyles.card}>
          <PlanFeatureRow
            name={featureALabel}
            available={!!plan.features.feature_a}
          />
          <PlanFeatureRow
            name={featureBLabel}
            available={!!plan.features.feature_b}
          />
        </View>
      </View>
    </BillingLayout>
  );
}
