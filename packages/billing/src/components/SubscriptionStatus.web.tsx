import type { ReactElement } from 'react';
import { usePlan } from '../hooks/usePlan.js';
import { useSubscription } from '../hooks/useSubscription.js';
import type { ProductBillingConfig } from '../schema.js';
import { subscriptionStatusLabel } from '../utils/subscriptionStatusLabel.js';
import type { SubscriptionStatusProps } from './SubscriptionStatus.types.js';

export function SubscriptionStatus<P extends ProductBillingConfig>({
  className,
  style,
}: SubscriptionStatusProps): ReactElement {
  const { data: sub, loading } = useSubscription<P>();
  const { data: plan } = usePlan<P>();

  if (loading) {
    return <div className={className}>…</div>;
  }

  const renewal = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString()
    : '—';

  return (
    <div className={className} style={style as React.CSSProperties}>
      <p>
        <strong>Plan:</strong> {plan?.display_name ?? sub?.plan_id ?? '—'}
      </p>
      <p>
        <strong>Status:</strong> {subscriptionStatusLabel(sub, renewal)}
      </p>
      {sub?.status === 'past_due' ? (
        <p style={{ color: '#92400e' }}>
          Payment issue — update billing in the portal.
        </p>
      ) : null}
      <p>
        <strong>Renews / period ends:</strong> {renewal}
      </p>
    </div>
  );
}
