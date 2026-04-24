import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = useAuthContext();

  useEffect(() => {
    // Supabase OAuth callbacks can come as hash fragments (#access_token=...) or query params (?error=...)
    // Check hash fragment first (successful OAuth)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    // Check query params for errors
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = queryParams.get('error') || hashParams.get('error');
    const errorDescription =
      queryParams.get('error_description') ||
      hashParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed. Please try again.');
      // Redirect to login after showing error
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      return;
    }

    // If we have an access token in the hash, Supabase client will pick it up automatically
    // Wait for auth state to update, then redirect
    if (accessToken) {
      // Give Supabase client time to process the token
      const timer = setTimeout(() => {
        if (auth.user && !auth.loading) {
          navigate('/dashboard', { replace: true });
        } else if (!auth.loading) {
          // If we got a token but no user after loading completes, there might be an issue
          setError(
            'Authentication completed but session not established. Please try again.'
          );
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }

    // If user is already authenticated (OAuth callback completed)
    if (auth.user && !auth.loading) {
      // Successful OAuth login, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [auth.user, auth.loading, navigate]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='rounded-md bg-red-50 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>
                  Authentication Error
                </h3>
                <div className='mt-2 text-sm text-red-700'>
                  <p>{error}</p>
                  <p className='mt-2'>Redirecting to login page...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8 text-center'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Completing sign in...
          </h2>
          <div className='mt-8 flex justify-center'>
            <svg
              className='animate-spin h-12 w-12 text-primary-600'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              />
            </svg>
          </div>
          <p className='mt-4 text-sm text-gray-600'>
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}
