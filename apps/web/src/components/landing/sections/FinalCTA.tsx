import { Link } from 'react-router';
import type { LandingConfig } from '@adopter/config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

interface FinalCTAProps {
  config: LandingConfig['finalCta'];
}

export function FinalCTA({ config }: FinalCTAProps) {
  return (
    <section className='py-20 bg-gray-100 dark:bg-gray-800'>
      <ContentContainer className='text-center'>
        <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
          {config.headline}
        </h2>
        <p className='text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto'>
          {config.subhead}
        </p>
        <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
          <Link
            to={config.ctaHref}
            className='inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors'
          >
            {config.ctaLabel}
          </Link>
          {config.secondaryCta && (
            <a
              href={config.secondaryCta.href}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors'
            >
              {config.secondaryCta.label}
            </a>
          )}
        </div>
      </ContentContainer>
    </section>
  );
}
