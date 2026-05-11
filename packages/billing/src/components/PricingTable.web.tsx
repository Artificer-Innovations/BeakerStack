import type { ReactElement } from 'react';
import { usePlan } from '../hooks/usePlan.js';
import { usePlanCatalog } from '../hooks/usePlanCatalog.js';
import type { ProductBillingConfig } from '../schema.js';
import type { PricingTableProps } from './PricingTable.types.js';

export function PricingTable<P extends ProductBillingConfig>({
  onSelectPlan,
  onCheckout,
  highlightCurrent,
  highlightPlanId,
  isAuthenticated = true,
  productId: _productId,
  currentUserId: _currentUserId,
  className,
  style,
}: PricingTableProps): ReactElement {
  void _productId;
  void _currentUserId;
  const onPlanChosen = onCheckout ?? onSelectPlan;
  const { plans, loading } = usePlanCatalog<P>();
  const { data: currentPlan } = usePlan<P>();

  return (
    <div className={className} style={style as React.CSSProperties}>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {plans.map(p => {
            const isCurrent =
              isAuthenticated &&
              ((highlightCurrent && currentPlan?.id === p.id) ||
                (highlightPlanId != null &&
                  highlightPlanId !== '' &&
                  p.id === highlightPlanId));
            return (
              <li
                key={p.id}
                style={{
                  border: isCurrent ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                }}
              >
                <strong>{p.display_name}</strong> —{' '}
                {(p.price_cents / 100).toFixed(2)} USD / {p.billing_period}
                {onPlanChosen ? (
                  <div style={{ marginTop: 8 }}>
                    <button type='button' onClick={() => onPlanChosen(p.id)}>
                      {isAuthenticated ? 'Select' : 'Get started'}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
