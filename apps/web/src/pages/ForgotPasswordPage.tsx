import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === '1';
  const auth = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await auth.requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />
      <ContentContainer className='py-12'>
        <div className='w-full max-w-md mx-auto space-y-8'>
          <div>
            <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white'>
              Reset your password
            </h2>
            <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {isExpired && (
            <div className='rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4'>
              <p className='text-sm text-yellow-800 dark:text-yellow-300'>
                Your password reset link has expired. Enter your email below to
                request a new one.
              </p>
            </div>
          )}

          {submitted ? (
            <div className='rounded-md bg-green-50 dark:bg-green-900/30 p-4'>
              <p className='text-sm text-green-800 dark:text-green-300'>
                If an account exists for <strong>{email}</strong>, you will
                receive a password reset email shortly.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className='rounded-md bg-red-50 dark:bg-red-900/30 p-4'>
                  <p className='text-sm font-medium text-red-800 dark:text-red-300'>
                    {error}
                  </p>
                </div>
              )}

              <form className='space-y-6' onSubmit={handleSubmit}>
                <div>
                  <label htmlFor='email' className='sr-only'>
                    Email address
                  </label>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    className='appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Email address'
                  />
                </div>

                <div>
                  <button
                    type='submit'
                    disabled={isLoading}
                    className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className='text-center'>
            <Link
              to='/login'
              className='font-medium text-primary-600 hover:text-primary-500 text-sm'
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </ContentContainer>
    </div>
  );
}
