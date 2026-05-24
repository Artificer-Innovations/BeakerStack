import React, { type ReactElement } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import {
  usePlan,
  usePlanCatalog,
  useUsage,
  useBillingState,
  type SubscriptionRow,
  type BillingUiStateKind,
} from '@beakerstack/billing';
import { formatMonthYear } from '@beakerstack/billing/presentation';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import {
  billingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '@adopter/config/billing';
import { numericPlanFeature } from '../../billing/planFeatureValue';
import { useDemoCollectionCount } from '@adopter/mobile/billing/useDemoCollectionCount';
import { BillingLayout } from './BillingLayout';
import { billingColors, billingStyles } from './styles';

function Banner({
  variant,
  title,
  body,
}: {
  variant: 'info' | 'warning' | 'error';
  title: string;
  body: string;
}): ReactElement {
  const palette =
    variant === 'error'
      ? {
          bg: billingColors.errorBg,
          border: billingColors.errorBorder,
          text: billingColors.errorText,
        }
      : variant === 'warning'
        ? {
            bg: billingColors.warnBg,
            border: billingColors.warnBorder,
            text: billingColors.warnText,
          }
        : {
            bg: billingColors.infoBg,
            border: billingColors.infoBorder,
            text: billingColors.infoText,
          };
  return (
    <View
      style={[
        billingStyles.banner,
        { borderColor: palette.border, backgroundColor: palette.bg },
      ]}
    >
      <Text style={[billingStyles.bannerTitle, { color: palette.text }]}>
        {title}
      </Text>
      <Text style={[billingStyles.bannerBody, { color: palette.text }]}>
        {body}
      </Text>
    </View>
  );
}

function OverviewBanners({
  kind,
  subscription,
  pendingTargetName,
}: {
  kind: BillingUiStateKind;
  subscription: SubscriptionRow | null;
  pendingTargetName?: string;
}): ReactElement | null {
  if (kind === 'loading' || kind === 'no_subscription') return null;
  if (kind === 'payment_failed') {
    return (
      <Banner
        variant='error'
        title='Payment problem'
        body={`Your last payment did not go through. Update your payment method in the ${getAdopterConfig().branding.displayName} web app.`}
      />
    );
  }
  if (kind === 'downgrade_pending' && subscription?.current_period_end) {
    const target = pendingTargetName ?? 'your next plan';
    return (
      <Banner
        variant='info'
        title='Plan change scheduled'
        body={`You'll be moved to ${target} on ${new Date(
          subscription.current_period_end
        ).toLocaleDateString()}.`}
      />
    );
  }
  if (kind === 'cancelled_pending' && subscription?.current_period_end) {
    return (
      <Banner
        variant='warning'
        title='Subscription cancelled'
        body={`Your subscription ends on ${new Date(
          subscription.current_period_end
        ).toLocaleDateString()}.`}
      />
    );
  }
  return null;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={[billingStyles.card, billingStyles.statTileCard]}>
      <Text style={billingStyles.small}>{label}</Text>
      <Text style={billingStyles.statValue}>{value}</Text>
    </View>
  );
}

function formatCollectionsStat(
  count: number,
  cap: number,
  loading: boolean,
  error: string | null
): string {
  if (loading) return '—';
  if (error) return 'Unable to load';
  if (cap === -1) return `${count} of unlimited`;
  return `${count} of ${cap}`;
}

export function BillingOverviewScreen(): ReactElement {
  const { kind, subscription } = useBillingState<typeof billingConfig>();
  const { plans: catalogPlans } = usePlanCatalog<typeof billingConfig>();
  const { data: currentPlan, loading: planLoad } =
    usePlan<typeof billingConfig>();
  const {
    used,
    limit,
    loading: usageLoad,
  } = useUsage<typeof billingConfig, typeof BEAKERSTACK_METER_AI_SUMMARIZE>(
    BEAKERSTACK_METER_AI_SUMMARIZE
  );
  const {
    count: colCount,
    loading: colLoad,
    error: colError,
  } = useDemoCollectionCount();
  const { user } = useAuthContext();

  const pendingTargetName =
    subscription?.pending_target_plan_id != null
      ? catalogPlans.find(p => p.id === subscription.pending_target_plan_id)
          ?.display_name
      : undefined;

  const containersCap = currentPlan
    ? numericPlanFeature(
        currentPlan.features as Record<string, unknown>,
        'containers_per_account_max'
      )
    : -1;

  return (
    <BillingLayout>
      <OverviewBanners
        kind={kind}
        subscription={subscription}
        pendingTargetName={pendingTargetName}
      />
      {planLoad && kind === 'loading' ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : currentPlan ? (
        <View style={billingStyles.card}>
          <Text style={billingStyles.cardTitle}>
            You're on the {currentPlan.display_name} plan
          </Text>
        </View>
      ) : null}

      <StatTile
        label="This month's usage"
        value={
          usageLoad
            ? '—'
            : limit === null
              ? `${used} used (unlimited)`
              : `${used} of ${limit} AI summaries`
        }
      />
      <StatTile
        label='Collections'
        value={formatCollectionsStat(
          colCount ?? 0,
          containersCap,
          colLoad,
          colError
        )}
      />
      <StatTile
        label='Member since'
        value={user?.created_at ? formatMonthYear(user.created_at) : '—'}
      />
    </BillingLayout>
  );
}
