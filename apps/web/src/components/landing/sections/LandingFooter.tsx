import { Link } from 'react-router-dom';
import type { LandingConfig } from '../../../config/landing';

interface LandingFooterProps {
  config: LandingConfig['footer'];
  brand: LandingConfig['brand'];
}

export function LandingFooter({ config, brand }: LandingFooterProps) {
  return (
    <footer className='border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-12'>
      <div className='max-w-[1200px] mx-auto px-6'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8 mb-10'>
          <div className='col-span-2 md:col-span-1'>
            <p className='font-bold text-gray-900 dark:text-white mb-2'>{brand.name}</p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>{brand.tagline}</p>
          </div>
          {config.columns.map(col => (
            <div key={col.heading}>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3'>
                {col.heading}
              </p>
              <ul className='space-y-2'>
                {col.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className='text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='border-t border-gray-200 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>{config.copyright}</p>
          <nav className='flex gap-4' aria-label='Legal'>
            {config.legalLinks.map(link => (
              <Link
                key={link.label}
                to={link.href}
                className='text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
