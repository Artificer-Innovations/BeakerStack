import { Link } from 'react-router-dom';
import type { LandingConfig } from '../../../config/landing';

interface HeroProps {
  config: LandingConfig['hero'];
}

export function Hero({ config }: HeroProps) {
  return (
    <section className='py-20 md:py-28'>
      <div className='max-w-[1200px] mx-auto px-6'>
        <div className='grid md:grid-cols-2 gap-12 items-center'>
          <div>
            {config.eyebrow && (
              <p className='text-sm font-medium text-primary-600 dark:text-primary-400 mb-3'>
                {config.eyebrow}
              </p>
            )}
            <h1 className='text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4'>
              {config.headline}
            </h1>
            <p className='text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg'>
              {config.subhead}
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link
                to={config.primaryCta.href}
                className='inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors'
              >
                {config.primaryCta.label}
              </Link>
              {config.secondaryCta && (
                <a
                  href={config.secondaryCta.href}
                  className='inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  {config.secondaryCta.label}
                </a>
              )}
            </div>
            {config.trustStrip && (
              <p className='mt-6 text-sm text-gray-500 dark:text-gray-500'>
                {config.trustStrip}
              </p>
            )}
          </div>

          <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-gray-100 dark:bg-gray-900 aspect-video flex items-center justify-center'>
            <img
              src={config.mediaSrc}
              alt={config.mediaAlt}
              className='w-full h-full object-cover'
              loading='eager'
              width={600}
              height={338}
              decoding='async'
              {...({ fetchPriority: 'high' } as object)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
