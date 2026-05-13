import { useCallback, useState } from 'react';
import { useBillingContext, usePlan, useUsage } from '@beakerstack/billing';
import { supabaseRpc } from '@/lib/supabase';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { DashboardDemoSection } from './DashboardDemoSection';

const PLANS = [
  { id: 'beakerstack_free' as const, label: 'Free' },
  { id: 'beakerstack_pro' as const, label: 'Pro' },
  { id: 'beakerstack_max' as const, label: 'Max' },
];

const METER_KEYS = [BEAKERSTACK_METER_AI_SUMMARIZE] as const;

export function DemoControlsPanel() {
  if (import.meta.env.VITE_BILLING_DEMO_MODE !== 'true') {
    return null;
  }

  const { data: plan, loading: planLoading } =
    usePlan<typeof beakerstackBillingConfig>();
  const { refreshSubscription } =
    useBillingContext<typeof beakerstackBillingConfig>();
  const { refresh: refreshUsage } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);

  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(async (key: string, fn: () => Promise<void>) => {
    setMessage(null);
    setPending(key);
    try {
      await fn();
      setMessage('Done.');
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Request failed. Is demo mode on?'
      );
    } finally {
      setPending(null);
    }
  }, []);

  const onSimulatePlan = useCallback(
    (planId: (typeof PLANS)[number]['id']) => {
      void run(`plan:${planId}`, async () => {
        const { error } = await supabaseRpc.rpc(
          'billing_demo_simulate_upgrade',
          {
            p_product_id: beakerstackBillingConfig.productId,
            p_plan_id: planId,
          }
        );
        if (error) throw error;
        await refreshSubscription();
      });
    },
    [refreshSubscription, run]
  );

  const onResetUsage = useCallback(() => {
    void run('reset', async () => {
      for (const m of METER_KEYS) {
        const { error } = await supabaseRpc.rpc('billing_demo_reset_usage', {
          p_product_id: beakerstackBillingConfig.productId,
          p_event_type: m,
        });
        if (error) throw error;
      }
      await refreshUsage();
    });
  }, [refreshUsage, run]);

  return (
    <DashboardDemoSection
      title='Demo controls'
      demonstrates='App RPCs (not in @beakerstack/billing): billing_demo_simulate_upgrade, billing_demo_reset_usage'
      description='These controls exist only when VITE_BILLING_DEMO_MODE=true and demo_billing_mode is enabled in the database. They live in the app layer and are explicitly NOT part of @beakerstack/billing. Production apps should remove this section.'
      codeReference='await supabaseRpc.rpc("billing_demo_simulate_upgrade", { p_product_id, p_plan_id })'
      variant='demo-mode'
    >
      <p className='text-sm text-gray-700 dark:text-gray-300'>
        Current plan:{' '}
        <span className='font-medium text-gray-900 dark:text-white'>
          {planLoading ? '…' : (plan?.display_name ?? '—')}
        </span>
      </p>

      <div className='mt-3 flex flex-wrap gap-2'>
        {PLANS.map(p => (
          <button
            key={p.id}
            type='button'
            disabled={plan?.id === p.id || pending != null}
            onClick={() => onSimulatePlan(p.id)}
            className='rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
          >
            {pending === `plan:${p.id}` ? '…' : `Switch to ${p.label}`}
          </button>
        ))}
      </div>

      <div className='mt-4'>
        <button
          type='button'
          disabled={pending != null}
          onClick={onResetUsage}
          className='rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
        >
          {pending === 'reset' ? '…' : 'Reset all usage counters'}
        </button>
      </div>

      {message && (
        <p
          className='mt-2 text-sm text-gray-600 dark:text-gray-300'
          role='status'
        >
          {message}
        </p>
      )}

      <p className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
        These actions take effect immediately and bypass Stripe. Do not deploy
        to production.
      </p>
    </DashboardDemoSection>
  );
}
