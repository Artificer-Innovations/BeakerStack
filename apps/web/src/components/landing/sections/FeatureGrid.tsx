import type { LandingConfig } from '../../../config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

interface FeatureGridProps {
  config: LandingConfig['featureGrid'];
}

export function FeatureGrid({ config }: FeatureGridProps) {
  return (
    <section
      id='features'
      className='py-20 md:py-24 bg-gray-50 dark:bg-gray-900'
    >
      <ContentContainer>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
            {config.heading}
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto'>
            {config.subhead}
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {config.items.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'
              >
                <div className='w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4'>
                  <Icon className='w-5 h-5 text-primary-600 dark:text-primary-400' />
                </div>
                <h3 className='text-base font-semibold text-gray-900 dark:text-white mb-2'>
                  {item.title}
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                  {item.body}
                </p>
                {item.ctaLabel && item.ctaHref && (
                  <a
                    href={item.ctaHref}
                    {...(item.ctaHref.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='mt-3 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'
                  >
                    {item.ctaLabel} →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </ContentContainer>
    </section>
  );
}
