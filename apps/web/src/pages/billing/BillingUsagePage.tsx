import {
  usePlan,
  useBillingState,
  useBillingConfig,
} from '@beakerstack/billing';
import { UsageIndicator } from '@beakerstack/billing/web';
import {
  billingConfig as adopterBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '@adopter/config/billing';
import {
  booleanFeatureLabel,
  mergeUsageLimitsCopy,
  mergeUsageMeterCopy,
} from '@beakerstack/billing/presentation';
import { useDemoCollectionCount } from '@adopter/web/billing/useDemoCollectionCount';
import { Banner } from '../../components/billing/Banner.web';
import { BillingPageShell } from '../../components/billing/BillingPageShell.web';
import { BillingTabs } from '../../components/billing/BillingTabs.web';
import { FeatureLimitRow } from '../../components/billing/FeatureLimitRow.web';
import { PlanFeatureRow } from '../../components/billing/PlanFeatureRow.web';

export default function BillingUsagePage() {
  const billingConfig = useBillingConfig<typeof adopterBillingConfig>();
  const meterCopy = mergeUsageMeterCopy(billingConfig);
  const limitsCopy = mergeUsageLimitsCopy(billingConfig);
  const featureALabel = booleanFeatureLabel(billingConfig, 'feature_a');
  const featureBLabel = booleanFeatureLabel(billingConfig, 'feature_b');
  const { data: plan } = usePlan<typeof billingConfig>();
  const { kind, subscription } = useBillingState<typeof billingConfig>();
  const { count: colCount = 0, maxItemsInAnyCollection = 0 } =
    useDemoCollectionCount();
  if (!plan) {
    return (
      <BillingPageShell>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
          Billing
        </h1>
        <div className='mt-4'>
          <BillingTabs />
        </div>
        <p className='mt-6 text-sm text-gray-600 dark:text-gray-400'>
          Loading plan…
        </p>
      </BillingPageShell>
    );
  }
  const containers = plan.features.containers_per_account_max as number;
  const itemsCap = plan.features.items_per_container_max as number;
  return (
    <BillingPageShell>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
        Billing
      </h1>
      <div className='mt-4'>
        <BillingTabs />
      </div>
      <div className='mt-6 space-y-6'>
        {kind === 'payment_failed' && (
          <Banner variant='error'>
            Payment failed. Limits may change if your plan lapses.
          </Banner>
        )}
        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 shadow-sm'>
          {subscription?.status === 'free' ||
          !subscription?.stripe_subscription_id
            ? `Your usage resets at the start of the next calendar month (free tier).`
            : 'Your usage resets on your next billing date (see Usage below for the exact reset date for meters).'}
        </div>
        <section>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Usage
          </h2>
          {Object.keys(plan.usage_limits).map(m => (
            <div key={m} className='mt-3'>
              <UsageIndicator<typeof billingConfig>
                meter={m as typeof BEAKERSTACK_METER_AI_SUMMARIZE}
                variant='expanded'
                label={meterCopy[m]?.label ?? m}
                description={meterCopy[m]?.description}
              />
            </div>
          ))}
        </section>
        <section>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Limits
          </h2>
          <div className='mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'>
            <FeatureLimitRow
              name={limitsCopy.collectionsRowName}
              used={colCount}
              cap={containers === -1 ? 0 : containers}
              capIsUnlimited={containers === -1}
            />
            <FeatureLimitRow
              name={limitsCopy.itemsRowName}
              used={maxItemsInAnyCollection}
              cap={itemsCap === -1 ? 0 : itemsCap}
              capIsUnlimited={itemsCap === -1}
            />
            <p className='pt-2 text-xs text-gray-500 dark:text-gray-400'>
              {limitsCopy.collectionsFootnote}
            </p>
          </div>
        </section>
        <section>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Plan features
          </h2>
          <div className='mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'>
            <PlanFeatureRow
              name={featureALabel}
              available={!!plan.features.feature_a}
              showUpgradeLink
            />
            <PlanFeatureRow
              name={featureBLabel}
              available={!!plan.features.feature_b}
              showUpgradeLink
            />
          </div>
        </section>
      </div>
    </BillingPageShell>
  );
}
