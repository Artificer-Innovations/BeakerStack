import { useMemo } from 'react';
import type { ProductBillingConfig } from '../schema.js';
import type { Plan, SubscriptionRow } from '../types.js';
import { useBillingContext } from './useBillingContext.js';
import { usePlan } from './usePlan.js';

/**
 * Coarse UI states for billing pages (align with billing UI v1 spec matrix).
 * `downgrade_pending`: `cancel_at_period_end` with `pending_target_plan_id` set (e.g. app-initiated downgrade to Free).
 * Paid→paid tier changes at period end without cancel are not implemented yet (Stripe updates apply immediately).
 */
export type BillingUiStateKind =
  | 'loading'
  | 'no_subscription'
  | 'free'
  | 'paid_active'
  | 'cancelled_pending'
  | 'payment_failed'
  | 'trialing'
  | 'trial_ending'
  | 'downgrade_pending'
  | 'comped';

export type BillingUiState = {
  kind: BillingUiStateKind;
  plan: Plan | null;
  subscription: SubscriptionRow | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SIMPLE_STATUS_KINDS = new Map<string, BillingUiStateKind>([
  ['free', 'free'],
  ['comped', 'comped'],
  ['past_due', 'payment_failed'],
]);

const PAID_ACTIVE_STATUSES = new Set([
  'active',
  'paused',
  'incomplete',
  'unpaid',
]);

function deriveTrialingKind(subscription: SubscriptionRow): BillingUiStateKind {
  if (subscription.trial_end) {
    const end = new Date(subscription.trial_end).getTime();
    if (
      !Number.isNaN(end) &&
      end > Date.now() &&
      end - Date.now() < 3 * MS_PER_DAY
    ) {
      return 'trial_ending';
    }
  }
  return 'trialing';
}

function deriveActiveKind(
  subscription: SubscriptionRow,
  st: string
): BillingUiStateKind {
  if (st === 'active' && !subscription.stripe_subscription_id) {
    return 'free';
  }
  if (PAID_ACTIVE_STATUSES.has(st)) {
    return 'paid_active';
  }
  if (st === 'canceled') {
    return 'free';
  }
  return 'paid_active';
}

function deriveKind(
  subscription: SubscriptionRow | null,
  subscriptionLoading: boolean
): BillingUiStateKind {
  if (subscriptionLoading) return 'loading';
  if (!subscription) return 'no_subscription';

  const st = subscription.status.toLowerCase();
  const simple = SIMPLE_STATUS_KINDS.get(st);
  if (simple) return simple;

  if (st === 'trialing') {
    return deriveTrialingKind(subscription);
  }

  if (subscription.cancel_at_period_end) {
    if (subscription.pending_target_plan_id) {
      return 'downgrade_pending';
    }
    return 'cancelled_pending';
  }

  return deriveActiveKind(subscription, st);
}

export function useBillingState<
  Config extends ProductBillingConfig,
>(): BillingUiState {
  const { subscription, subscriptionLoading } = useBillingContext<Config>();
  const { data: plan } = usePlan<Config>();

  return useMemo((): BillingUiState => {
    return {
      kind: deriveKind(subscription, subscriptionLoading),
      plan,
      subscription,
    };
  }, [subscription, subscriptionLoading, plan]);
}
