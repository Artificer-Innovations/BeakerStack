import { BillingProvider } from '@beakerstack/billing';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { beakerstackBillingConfig } from '../billing/beakerstackBillingConfig';
import { BILLING_DEEP_LINK_URL } from '../billing/BILLING_DEEP_LINK_URLs';
import { supabase } from '../lib/supabase';
import { BillingNavigator } from '../navigation/BillingNavigator';

export default function BillingScreen(): ReactElement {
  const navigation = useNavigation();

  // Hide the bottom tab bar while the billing screen is in focus.
  // getParent() is null on the current flat stack (pre-#116) — the call is a safe no-op.
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

  return (
    <View style={s.container}>
      <BillingProvider<typeof beakerstackBillingConfig>
        supabase={supabase}
        config={beakerstackBillingConfig}
        checkoutSuccessUrl={BILLING_DEEP_LINK_URL}
        checkoutCancelUrl={BILLING_DEEP_LINK_URL}
        portalReturnUrl={BILLING_DEEP_LINK_URL}
      >
        <BillingNavigator />
      </BillingProvider>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
});
