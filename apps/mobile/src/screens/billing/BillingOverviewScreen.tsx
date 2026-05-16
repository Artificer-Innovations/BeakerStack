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
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { useDemoCollectionCount } from '../../billing/useDemoCollectionCount';
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
  const colors =
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
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: '600', color: colors.text }}>{title}</Text>
      <Text style={{ marginTop: 4, fontSize: 14, color: colors.text }}>
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
        body='Your last payment did not go through. Update your payment method in the BeakerStack web app.'
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
    <View style={[billingStyles.card, { marginBottom: 12 }]}>
      <Text style={billingStyles.small}>{label}</Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: 15,
          fontWeight: '600',
          color: billingColors.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function BillingOverviewScreen(): ReactElement {
  const { kind, subscription } =
    useBillingState<typeof beakerstackBillingConfig>();
  const { plans: catalogPlans } =
    usePlanCatalog<typeof beakerstackBillingConfig>();
  const { data: currentPlan, loading: planLoad } =
    usePlan<typeof beakerstackBillingConfig>();
  const {
    used,
    limit,
    loading: usageLoad,
  } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const { count: colCount, loading: colLoad } = useDemoCollectionCount();
  const { user } = useAuthContext();

  const pendingTargetName =
    subscription?.pending_target_plan_id != null
      ? catalogPlans.find(p => p.id === subscription.pending_target_plan_id)
          ?.display_name
      : undefined;

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
            You&apos;re on the {currentPlan.display_name} plan
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
        value={
          colLoad
            ? '—'
            : (() => {
                const cap = currentPlan?.features
                  .containers_per_account_max as number;
                if (cap === -1) return `${colCount ?? 0} of unlimited`;
                return `${colCount ?? 0} of ${cap}`;
              })()
        }
      />
      <StatTile
        label='Member since'
        value={user?.created_at ? formatMonthYear(user.created_at) : '—'}
      />
    </BillingLayout>
  );
}
