import type { LandingConfig } from '../../../config/landing';

interface FeatureRowsProps {
  config: LandingConfig['featureRows'];
}

export function FeatureRows({ config }: FeatureRowsProps) {
  return (
    <section className='py-20 md:py-24'>
      <div className='max-w-[1200px] mx-auto px-6 space-y-24'>
        {config.map(row => {
          const imageFirst = row.mediaSide === 'left';
          const isExternal = row.ctaHref.startsWith('http');
          return (
            <div
              key={row.title}
              className='grid md:grid-cols-2 gap-12 items-center'
            >
              {/* On mobile: image always first */}
              <div className={`order-1 ${imageFirst ? 'md:order-1' : 'md:order-2'}`}>
                <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-900 aspect-video flex items-center justify-center'>
                  <img
                    src={row.mediaSrc}
                    alt={row.mediaAlt}
                    className='w-full h-full object-cover'
                    loading='lazy'
                    width={560}
                    height={315}
                    decoding='async'
                  />
                </div>
              </div>
              <div className={`order-2 ${imageFirst ? 'md:order-2' : 'md:order-1'}`}>
                <h2 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4'>
                  {row.title}
                </h2>
                <p className='text-gray-600 dark:text-gray-400 mb-6 leading-relaxed'>
                  {row.body}
                </p>
                <a
                  href={row.ctaHref}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'
                >
                  {row.ctaLabel} →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
