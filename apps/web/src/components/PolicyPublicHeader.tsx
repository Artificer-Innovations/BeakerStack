import { Link } from 'react-router-dom';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { useMarketingAuthHint } from '../hooks/useMarketingAuthHint';
import { getPrPreviewAssetBasePath } from '../lib/prPreviewAssetBasePath';

/**
 * Policy/legal routes render outside {@link AuthenticatedApp}; this header mirrors
 * {@link AppHeader} chrome without AuthProvider, using the same localStorage hint as landing Nav.
 */
export function PolicyPublicHeader() {
  const marketingAuthHint = useMarketingAuthHint();
  const basePath = getPrPreviewAssetBasePath();

  return (
    <div className='bg-white dark:bg-gray-900 shadow dark:shadow-gray-800 border-b border-transparent dark:border-gray-700'>
      <div className='max-w-[1024px] mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center space-x-3'>
            <Link to='/' className='flex items-center'>
              <img
                src={`${basePath}demo-flask-icon.svg`}
                alt={BRANDING.displayName}
                className='w-8 h-8'
              />
            </Link>
            <Link
              to='/'
              className='text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300'
            >
              {BRANDING.displayName}
            </Link>
          </div>

          <div className='flex items-center space-x-4'>
            {marketingAuthHint ? (
              <Link
                to='/dashboard'
                className='bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700'
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to='/login'
                  className='text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium'
                >
                  Sign In
                </Link>
                <Link
                  to='/signup'
                  className='bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700'
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
