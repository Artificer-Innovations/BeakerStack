import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { ExternalLink } from 'lucide-react';

export function DemoBanner() {
  const { branding } = getAdopterConfig();
  return (
    <div className='rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 shadow-lg text-white'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='min-w-0'>
          <span className='inline-block rounded bg-indigo-500/40 px-2 py-0.5 font-mono text-xs font-semibold tracking-widest uppercase text-indigo-200 mb-2'>
            Developer Demo
          </span>
          <h2 className='text-xl font-bold'>
            {branding.displayName} in action
          </h2>
          <p className='mt-1 max-w-2xl text-sm text-indigo-200'>
            Real billing primitives —{' '}
            <code className='font-mono text-indigo-100'>useFeature</code>,{' '}
            <code className='font-mono text-indigo-100'>useUsage</code>, and{' '}
            <code className='font-mono text-indigo-100'>FeatureGate</code> —
            wired into a product-style UI. Collections and items are sample
            domain labels; the billing logic is live.
          </p>
        </div>
        <div className='flex flex-wrap gap-3 shrink-0'>
          <a
            href='https://github.com/Artificer-Innovations/BeakerStack'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors'
          >
            <ExternalLink className='h-3.5 w-3.5' aria-hidden />
            View on GitHub
          </a>
          <a
            href='https://github.com/Artificer-Innovations/BeakerStack/generate'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-50 transition-colors'
          >
            Use this template
          </a>
        </div>
      </div>
    </div>
  );
}
