import type { SupabaseClient } from '@supabase/supabase-js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BillingConfigReactContext, BillingReactContext } from './context.js';
import { billingError, mapUnknownError } from './errors.js';
import type { ProductBillingConfig } from './schema.js';
import { productBillingConfigSchema } from './schema.js';
import type { BillingContextValue, SubscriptionRow } from './types.js';

export type BillingProviderProps<P extends ProductBillingConfig> = {
  supabase: SupabaseClient;
  config: P;
  children: React.ReactNode;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
  stripeFunctionName?: string;
};

export function BillingProvider<P extends ProductBillingConfig>({
  supabase,
  config: rawConfig,
  children,
  checkoutSuccessUrl,
  checkoutCancelUrl,
  portalReturnUrl,
  stripeFunctionName = 'billing-stripe',
}: BillingProviderProps<P>): React.ReactElement {
  const config = useMemo(
    () => productBillingConfigSchema.parse(rawConfig) as P,
    [rawConfig]
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<ReturnType<
    typeof billingError
  > | null>(null);
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null);

  const loadSubscription = useCallback(
    async (uid: string) => {
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      try {
        const { data, error } = await supabase
          .from('billing_subscriptions')
          .select('*')
          .eq('user_id', uid)
          .eq('product_id', config.productId)
          .maybeSingle();
        if (error) throw error;
        setSubscription((data as SubscriptionRow | null) ?? null);
      } catch (e) {
        setSubscriptionError(mapUnknownError(e));
        setSubscription(null);
      } finally {
        setSubscriptionLoading(false);
      }
    },
    [supabase, config.productId]
  );

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    await loadSubscription(userId);
  }, [userId, loadSubscription]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
    })();
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      authSub.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { error } = await supabase.rpc('ensure_billing_subscription', {
          p_product_id: config.productId,
        });
        if (error) throw error;
        if (!cancelled) await loadSubscription(userId);
      } catch (e) {
        if (!cancelled) setSubscriptionError(mapUnknownError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, supabase, config.productId, loadSubscription]);

  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }
    const filter = `user_id=eq.${userId}`;
    const ch = supabase
      .channel(`billing_subscriptions:${config.productId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_subscriptions',
          filter,
        },
        payload => {
          const row = (payload.new ?? payload.old) as
            | SubscriptionRow
            | undefined;
          if (row && row.product_id === config.productId) {
            void loadSubscription(userId);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [userId, supabase, config.productId, loadSubscription]);

  /** After Stripe Checkout, the row is written by `stripe-webhook` (async). Poll briefly so the UI updates even if Realtime lags or the user lands before the webhook finishes. */
  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('checkout') !== 'success') return;

    let attempts = 0;
    const maxAttempts = 20;
    void refreshSubscription();
    const id = window.setInterval(() => {
      attempts += 1;
      void refreshSubscription();
      if (attempts >= maxAttempts) window.clearInterval(id);
    }, 2000);
    return () => window.clearInterval(id);
  }, [userId, refreshSubscription]);

  const value = useMemo<BillingContextValue<P>>(
    () => ({
      supabase,
      config,
      userId,
      subscription,
      subscriptionLoading,
      subscriptionError,
      refreshSubscription,
      checkoutSuccessUrl,
      checkoutCancelUrl,
      portalReturnUrl,
      stripeFunctionName,
    }),
    [
      supabase,
      config,
      userId,
      subscription,
      subscriptionLoading,
      subscriptionError,
      refreshSubscription,
      checkoutSuccessUrl,
      checkoutCancelUrl,
      portalReturnUrl,
      stripeFunctionName,
    ]
  );

  return (
    <BillingConfigReactContext.Provider value={config}>
      <BillingReactContext.Provider
        value={value as BillingContextValue<ProductBillingConfig>}
      >
        {children}
      </BillingReactContext.Provider>
    </BillingConfigReactContext.Provider>
  );
}
