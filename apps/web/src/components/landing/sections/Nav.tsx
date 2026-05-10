import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LandingConfig } from '../../../config/landing';

interface NavProps {
  config: LandingConfig['nav'] & { brand: LandingConfig['brand'] };
}

export function Nav({ config }: NavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white dark:bg-gray-950 transition-shadow ${
        scrolled ? 'border-b border-gray-200 dark:border-gray-800 shadow-sm' : ''
      }`}
    >
      <div className='max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16'>
        <Link to='/' className='font-bold text-lg text-gray-900 dark:text-white'>
          {config.brand.name}
        </Link>

        <nav className='hidden md:flex items-center gap-8' aria-label='Main'>
          {config.links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className='text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors'
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className='flex items-center gap-3'>
          <Link
            to={config.signInHref}
            className='hidden sm:inline-flex text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 transition-colors'
          >
            Sign in
          </Link>
          <Link
            to={config.signUpHref}
            className='inline-flex text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-1.5 rounded-md transition-colors'
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
