import { Link } from 'react-router-dom';
import { LEGAL_CONFIG } from '@beakerstack/shared/config/legal';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className='border-t border-gray-200 bg-white'>
      <div className='max-w-[1024px] mx-auto px-4 py-6 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center gap-3 sm:flex-row sm:justify-between'>
          <p className='text-sm text-gray-500'>
            &copy; {year} {LEGAL_CONFIG.legalEntityName}. All rights reserved.
          </p>
          <nav className='flex gap-6' aria-label='Legal'>
            <Link
              to='/terms'
              className='text-sm text-gray-500 hover:text-gray-900 transition-colors'
            >
              Terms of Service
            </Link>
            <Link
              to='/privacy'
              className='text-sm text-gray-500 hover:text-gray-900 transition-colors'
            >
              Privacy Policy
            </Link>
            <Link
              to='/refunds'
              className='text-sm text-gray-500 hover:text-gray-900 transition-colors'
            >
              Refund Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
