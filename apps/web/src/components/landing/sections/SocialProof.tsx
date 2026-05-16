import type { LandingConfig } from '../../../config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

interface SocialProofProps {
  config?: LandingConfig['socialProof'];
}

export function SocialProof({ config }: SocialProofProps) {
  if (!config) return null;

  if (config.kind === 'metrics') {
    return (
      <section className='py-16 border-y border-gray-200 dark:border-gray-800'>
        <ContentContainer>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
            {config.items.map(item => (
              <div key={item.metric}>
                <p className='text-3xl font-bold text-gray-900 dark:text-white mb-1'>
                  {item.metric}
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </ContentContainer>
      </section>
    );
  }

  if (config.kind === 'testimonials') {
    return (
      <section className='py-20 bg-gray-50 dark:bg-gray-900'>
        <ContentContainer>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {config.items.map(item => (
              <blockquote
                key={item.author}
                className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'
              >
                <p className='text-gray-700 dark:text-gray-300 mb-4 leading-relaxed'>
                  "{item.quote}"
                </p>
                <footer className='text-sm'>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {item.author}
                  </span>
                  {item.role && (
                    <span className='text-gray-500 dark:text-gray-400'>
                      , {item.role}
                    </span>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>
        </ContentContainer>
      </section>
    );
  }

  return null;
}
