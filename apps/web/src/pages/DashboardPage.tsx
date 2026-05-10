import { Link } from 'react-router-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { BooleanGatesDemo } from '@/components/dashboard/BooleanGatesDemo';
import { DashboardDemoSection } from '@/components/dashboard/DashboardDemoSection';
import { DemoControlsPanel } from '@/components/dashboard/DemoControlsPanel';
import { MeteredUsageDemo } from '@/components/dashboard/MeteredUsageDemo';
import { NumericCapsDemo } from '@/components/dashboard/NumericCapsDemo';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <AppHeader supabaseClient={supabase} />

      <div className='mx-auto max-w-[1024px] px-4 py-6 sm:px-6 lg:px-8'>
        <div className='sm:px-0'>
          <h1 className='text-2xl font-bold text-gray-900'>
            Welcome to BeakerStack
          </h1>
          <p className='mt-3 text-sm text-gray-600'>
            This dashboard is a sandbox for exercising the billing primitives in{' '}
            <code className='rounded bg-gray-100 px-1 py-0.5 text-xs'>
              @beakerstack/billing
            </code>{' '}
            directly. Each section below demonstrates one capability with
            working controls and code references. For the polished,
            production-style billing UI, visit{' '}
            <Link
              to='/billing'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              Billing
            </Link>
            .
          </p>
          <div className='mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
            <Link
              to='/billing'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              View polished billing pages →
            </Link>
            {/* TODO: replace href when billing integration guide URL is published */}
            <a
              href='#'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              Read the integration guide →
            </a>
          </div>

          <div className='mt-8 space-y-6'>
            <DashboardDemoSection
              title='Metered usage'
              demonstrates='useUsage, useRecordUsage, UsageIndicator'
              description='The AI summarize action is metered. Free tier allows 30 per month; Pro 500; Max unlimited. Usage resets monthly for free users and per billing period for paid users.'
              codeReference='useRecordUsage("ai_summarize")'
            >
              <MeteredUsageDemo />
            </DashboardDemoSection>

            <DashboardDemoSection
              title='Numeric feature caps'
              demonstrates='useFeature with numeric values, hierarchical container caps'
              description='Free tier allows 2 collections with 3 items per collection. Pro allows unlimited collections with 25 items each. Max allows unlimited both. Caps are enforced via useFeature returning a numeric value rather than going through usage events.'
              codeReference='useFeature("containers_per_account_max")'
            >
              <NumericCapsDemo />
            </DashboardDemoSection>

            <DashboardDemoSection
              title='Boolean feature gates'
              demonstrates='FeatureGate component, useFeature for boolean features'
              description='Feature A unlocks at Pro and above. Feature B unlocks at Max only. Each section below shows the FeatureGate behavior at your current plan: enabled features render their content; disabled features render the fallback.'
              codeReference='<FeatureGate feature="feature_a" fallback={...} />'
            >
              <BooleanGatesDemo />
            </DashboardDemoSection>

            <DemoControlsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
