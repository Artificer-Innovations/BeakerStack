import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { readAndClearPostAuthRedirect } from '../auth/postAuthRedirect';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = useAuthContext();
  const navigatedRef = useRef(false);
  const authRef = useRef(auth);
  authRef.current = auth;
  const delayedLoginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (navigatedRef.current) return;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = queryParams.get('error') || hashParams.get('error');
    const errorDescription =
      queryParams.get('error_description') ||
      hashParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed. Please try again.');
      const t = setTimeout(() => {
        navigatedRef.current = true;
        navigate('/login', { replace: true });
      }, 3000);
      return () => clearTimeout(t);
    }

    if (auth.loading) return;

    if (auth.user) {
      navigatedRef.current = true;
      const stored = readAndClearPostAuthRedirect();
      navigate(stored ?? '/dashboard', { replace: true });
      return;
    }

    const accessToken =
      hashParams.get('access_token') || queryParams.get('access_token');
    if (!accessToken) {
      return;
    }

    const timer = setTimeout(() => {
      if (navigatedRef.current) return;
      const a = authRef.current;
      if (a.user && !a.loading) {
        navigatedRef.current = true;
        const stored = readAndClearPostAuthRedirect();
        navigate(stored ?? '/dashboard', { replace: true });
      } else if (!a.loading) {
        setError(
          'Authentication completed but session not established. Please try again.'
        );
        delayedLoginTimerRef.current = setTimeout(() => {
          navigatedRef.current = true;
          navigate('/login', { replace: true });
        }, 3000);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      if (delayedLoginTimerRef.current) {
        clearTimeout(delayedLoginTimerRef.current);
        delayedLoginTimerRef.current = null;
      }
    };
  }, [auth.user, auth.loading, navigate]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='rounded-md bg-red-50 dark:bg-red-900/30 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800 dark:text-red-300'>
                  Authentication Error
                </h3>
                <div className='mt-2 text-sm text-red-700 dark:text-red-400'>
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
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8 text-center'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white'>
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
          <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}
