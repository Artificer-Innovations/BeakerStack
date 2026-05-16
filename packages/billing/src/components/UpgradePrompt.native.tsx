import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { mapUnknownError } from '../errors.js';
import { useCheckout } from '../hooks/useCheckout.js';
import type { ProductBillingConfig } from '../schema.js';
import { launchStripeCheckout } from '../utils/launchStripeCheckout.native.js';
import type { UpgradePromptProps } from './UpgradePrompt.types.js';

export function UpgradePrompt<P extends ProductBillingConfig>({
  targetTier,
  suggestedPlanId,
  reason,
  children,
  style,
}: UpgradePromptProps): ReactElement {
  const planId = suggestedPlanId ?? targetTier;
  const { startCheckout, pending, error: checkoutError } = useCheckout<P>();
  const [openError, setOpenError] = useState<string | null>(null);

  const onUpgrade = async () => {
    if (!planId) return;
    setOpenError(null);
    try {
      const ok = await launchStripeCheckout(startCheckout, planId);
      if (!ok && !checkoutError) {
        setOpenError('Could not start checkout');
      }
    } catch (e) {
      setOpenError(mapUnknownError(e).message);
    }
  };

  if (typeof children === 'function') {
    return <>{children({ onUpgrade, pending })}</>;
  }

  const displayError = openError ?? checkoutError?.message;

  return (
    <View style={style}>
      <Text>{reason}</Text>
      {displayError ? (
        <Text style={{ color: 'red' }}>{displayError}</Text>
      ) : null}
      <Pressable disabled={pending} onPress={() => void onUpgrade()}>
        <Text>{pending ? '…' : 'Upgrade'}</Text>
      </Pressable>
      {children}
    </View>
  );
}
