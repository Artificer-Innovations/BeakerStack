import type { ReactElement } from 'react';
import { useCheckout } from '../hooks/useCheckout.js';
import type { ProductBillingConfig } from '../schema.js';
import type { UpgradePromptProps } from './UpgradePrompt.types.js';

export function UpgradePrompt<P extends ProductBillingConfig>({
  targetTier,
  suggestedPlanId,
  reason,
  children,
  className,
  style,
}: UpgradePromptProps): ReactElement {
  const planId = suggestedPlanId ?? targetTier;
  const { startCheckout, pending, error } = useCheckout<P>();

  const onUpgrade = async () => {
    if (!planId) return;
    const r = await startCheckout(planId);
    if (r?.checkoutUrl && typeof window !== 'undefined') {
      window.location.href = r.checkoutUrl;
    }
  };

  if (typeof children === 'function') {
    return <>{children({ onUpgrade, pending })}</>;
  }

  return (
    <div className={className} style={style as React.CSSProperties}>
      <p>{reason}</p>
      {error ? <p style={{ color: 'red' }}>{error.message}</p> : null}
      <button type='button' disabled={pending} onClick={() => void onUpgrade()}>
        {pending ? '…' : 'Upgrade'}
      </button>
      {children}
    </div>
  );
}
