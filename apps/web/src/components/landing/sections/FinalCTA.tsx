import { Link } from 'react-router-dom';
import type { LandingConfig } from '../../../config/landing';

interface FinalCTAProps {
  config: LandingConfig['finalCta'];
}

export function FinalCTA({ config }: FinalCTAProps) {
  return (
    <section className='py-20 bg-gray-100 dark:bg-gray-800'>
      <div className='max-w-[1200px] mx-auto px-6 text-center'>
        <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
          {config.headline}
        </h2>
        <p className='text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto'>
          {config.subhead}
        </p>
        <Link
          to={config.ctaHref}
          className='inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors'
        >
          {config.ctaLabel}
        </Link>
      </div>
    </section>
  );
}
