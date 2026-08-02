import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { LandingConfig } from '@adopter/config/landing';
import { ARTICLES_NAV_LINK } from '@beakerstack/articles/nav';
import { HELP_NAV_LINK } from '@beakerstack/help/nav';
import { useMarketingAuthHint } from '../../../hooks/useMarketingAuthHint';
import { getPrPreviewAssetBasePath } from '../../../lib/prPreviewAssetBasePath';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

interface NavProps {
  config: LandingConfig['nav'] & { brand: LandingConfig['brand'] };
}

function NavLinkItem({
  href,
  label,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  className: string;
  onNavigate?: () => void;
}) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} onClick={onNavigate}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      onClick={onNavigate}
      rel='noopener noreferrer'
    >
      {label}
    </a>
  );
}

export function Nav({ config }: NavProps) {
  const marketingAuthHint = useMarketingAuthHint();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    ...config.links.filter(
      link =>
        link.href !== HELP_NAV_LINK.href && link.href !== ARTICLES_NAV_LINK.href
    ),
    ARTICLES_NAV_LINK,
    HELP_NAV_LINK,
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logoSrc =
    config.brand.logoSrc ?? `${getPrPreviewAssetBasePath()}demo-flask-icon.svg`;

  return (
    <header
      className={`sticky top-0 z-50 bg-white dark:bg-gray-950 transition-shadow ${
        scrolled
          ? 'border-b border-gray-200 dark:border-gray-800 shadow-sm'
          : ''
      }`}
    >
      <ContentContainer className='flex items-center justify-between h-16'>
        <Link to='/' className='flex items-center gap-2'>
          <img src={logoSrc} alt='' className='w-8 h-8' />
          <span className='font-semibold text-lg text-gray-900 dark:text-white'>
            {config.brand.name}
          </span>
        </Link>

        <nav className='hidden md:flex items-center gap-8' aria-label='Main'>
          {navLinks.map(link => (
            <NavLinkItem
              key={link.href}
              href={link.href}
              label={link.label}
              className='text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors'
            />
          ))}
        </nav>

        <div className='flex items-center gap-3'>
          {marketingAuthHint ? (
            <Link
              to='/dashboard'
              className='inline-flex text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-1.5 rounded-md transition-colors'
            >
              Go to dashboard
            </Link>
          ) : (
            <>
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
            </>
          )}
          <button
            className='md:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            aria-label='Toggle menu'
            aria-expanded={menuOpen}
            aria-controls='mobile-nav'
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            )}
          </button>
        </div>
      </ContentContainer>

      {menuOpen && (
        <nav
          id='mobile-nav'
          className='md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'
          aria-label='Mobile'
        >
          <ContentContainer className='py-4 flex flex-col gap-1'>
            {navLinks.map(link => (
              <NavLinkItem
                key={link.href}
                href={link.href}
                label={link.label}
                className='text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0'
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            {marketingAuthHint ? (
              <Link
                to='/dashboard'
                className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors py-2.5'
                onClick={() => setMenuOpen(false)}
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                to={config.signInHref}
                className='text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2.5'
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </ContentContainer>
        </nav>
      )}
    </header>
  );
}
