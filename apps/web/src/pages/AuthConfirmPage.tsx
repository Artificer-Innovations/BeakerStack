import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { readAndClearPostAuthRedirect } from '../auth/postAuthRedirect';

type OtpType = 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite';

const VALID_TYPES: OtpType[] = ['signup', 'recovery', 'magiclink', 'email_change', 'invite'];

export default function AuthConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as OtpType | null;

    if (!tokenHash || !type || !VALID_TYPES.includes(type)) {
      setError('This confirmation link is invalid or has already been used.');
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          if (type === 'recovery') {
            navigate('/forgot-password?expired=1', { replace: true });
          } else {
            setError('This link has expired or is invalid. Please request a new one.');
          }
          return;
        }
        // recovery → ResetPasswordPage which reads the recovery session
        // invite → waitlist SignupInvitePage is a separate flow using custom RPC tokens;
        //          Supabase-native inviteUserByEmail tokens land here and go to dashboard
        if (type === 'recovery') {
          navigate('/reset-password', { replace: true });
        } else {
          const stored = readAndClearPostAuthRedirect();
          navigate(stored ?? '/dashboard', { replace: true });
        }
      })
      .catch(() => {
        setError('Something went wrong. Please try again later.');
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='rounded-md bg-red-50 dark:bg-red-900/30 p-4'>
            <div>
              <h3 className='text-sm font-medium text-red-800 dark:text-red-300'>
                Confirmation Error
              </h3>
              <div className='mt-2 text-sm text-red-700 dark:text-red-400'>
                <p>{error}</p>
                <p className='mt-2'>
                  <Link to='/'>Return to home</Link>
                </p>
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
            Verifying your link…
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
            Please wait while we verify your link…
          </p>
        </div>
      </div>
    </div>
  );
}
