import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCheckout } from '../hooks/useCheckout.js';
import type { ProductBillingConfig } from '../schema.js';
import type { UpgradePromptProps } from './UpgradePrompt.types.js';

export function UpgradePrompt<P extends ProductBillingConfig>({
  targetTier,
  suggestedPlanId,
  reason,
  children,
  style,
}: UpgradePromptProps): ReactElement {
  const planId = suggestedPlanId ?? targetTier;
  const { startCheckout, pending, error } = useCheckout<P>();

  const onUpgrade = async () => {
    if (!planId) return;
    const r = await startCheckout(planId);
    if (r?.checkoutUrl) {
      const { Linking } = await import('react-native');
      await Linking.openURL(r.checkoutUrl);
    }
  };

  if (typeof children === 'function') {
    return <>{children({ onUpgrade, pending })}</>;
  }

  return (
    <View style={style}>
      <Text>{reason}</Text>
      {error ? <Text style={{ color: 'red' }}>{error.message}</Text> : null}
      <Pressable disabled={pending} onPress={() => void onUpgrade()}>
        <Text>{pending ? '…' : 'Upgrade'}</Text>
      </Pressable>
      {children}
    </View>
  );
}
