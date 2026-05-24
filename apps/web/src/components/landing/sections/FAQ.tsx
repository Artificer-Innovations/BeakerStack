import type { LandingConfig } from '@adopter/config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

interface FAQProps {
  config: LandingConfig['faq'];
}

export function FAQ({ config }: FAQProps) {
  return (
    <section id='faq' className='py-20 md:py-24'>
      <ContentContainer variant='prose'>
        <h2 className='text-3xl font-bold text-gray-900 dark:text-white text-center mb-12'>
          {config.heading}
        </h2>
        <div className='space-y-2'>
          {config.items.map(item => (
            <details
              key={item.q}
              className='group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
            >
              <summary className='flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 select-none list-none'>
                {item.q}
                <span
                  className='ml-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180'
                  aria-hidden='true'
                >
                  ▾
                </span>
              </summary>
              <div className='px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </ContentContainer>
    </section>
  );
}
