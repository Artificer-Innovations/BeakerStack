import { BillingProvider } from '@beakerstack/billing';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { supabase } from '@/lib/supabase';
import { SocialLoginButton } from '../components/SocialLoginButton';
import { SignupPlanSummary } from '../components/auth/SignupPlanSummary';
import { beakerstackBillingConfig } from '../billing/beakerstackBillingConfig';
import {
  clearPostAuthRedirectKeys,
  hasPaidPlanIntent,
  POST_AUTH_REDIRECT_KEY,
  resolvePostAuthDestination,
  serializePostAuthRedirectPayload,
} from '../auth/postAuthRedirect';
import { appBasePath } from '../lib/appBasePath';

function SignupPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuthContext();

  const paidIntent = hasPaidPlanIntent(searchParams);
  const postAuthPath = resolvePostAuthDestination(searchParams);
  const loginSearch = searchParams.toString();
  const loginTo = loginSearch ? `/login?${loginSearch}` : '/login';

  const stashOAuthIntent = () => {
    if (postAuthPath !== '/dashboard') {
      sessionStorage.setItem(
        POST_AUTH_REDIRECT_KEY,
        serializePostAuthRedirectPayload(postAuthPath)
      );
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await auth.signUp(email, password);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        clearPostAuthRedirectKeys();
        navigate(postAuthPath, { replace: true });
      } else if (paidIntent && postAuthPath !== '/dashboard') {
        localStorage.setItem(
          POST_AUTH_REDIRECT_KEY,
          serializePostAuthRedirectPayload(postAuthPath)
        );
        setAwaitingEmail(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    try {
      stashOAuthIntent();
      await auth.signInWithGoogle();
    } catch (err) {
      sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      setError(
        err instanceof Error ? err.message : 'Failed to sign up with Google'
      );
    }
  };

  const displayName =
    beakerstackBillingConfig.plans.find(p => p.id === searchParams.get('plan'))
      ?.displayName ?? 'this plan';
  const submitLabel = isLoading
    ? 'Creating account...'
    : paidIntent && postAuthPath !== '/dashboard'
      ? `Continue with ${displayName}`
      : 'Create account';

  const showPlanAside = paidIntent && postAuthPath !== '/dashboard';

  if (awaitingEmail) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        <AppHeader supabaseClient={supabase} />
        <ContentContainer className='py-12'>
          <div className='mx-auto max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
              Check your email
            </h2>
            <p className='mt-3 text-sm text-gray-600 dark:text-gray-300'>
              We sent a confirmation link to <strong>{email}</strong>. Click the
              link in that email to finish creating your account — we&apos;ll
              take you to billing to complete your plan when you&apos;re signed
              in.
            </p>
            <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
              <Link to={loginTo} className='font-medium text-primary-600'>
                Already confirmed? Sign in
              </Link>
            </p>
          </div>
        </ContentContainer>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />
      <ContentContainer className='py-12'>
        <div
          className={
            showPlanAside
              ? 'grid w-full gap-10 md:grid-cols-2 md:items-start'
              : 'w-full space-y-8'
          }
        >
          <div
            className={
              showPlanAside ? 'order-2 md:order-1 space-y-8' : 'space-y-8'
            }
          >
            <div>
              <h2 className='mt-0 text-center text-3xl font-extrabold text-gray-900 dark:text-white md:text-left'>
                {paidIntent && postAuthPath !== '/dashboard'
                  ? `Create your account to continue with ${displayName}`
                  : 'Create your account'}
              </h2>
              {paidIntent && postAuthPath !== '/dashboard' ? (
                <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400 md:text-left'>
                  No charge until you finish checkout on the next step.
                </p>
              ) : null}
            </div>

            <div className='space-y-3'>
              <SocialLoginButton onPress={handleGoogleSignup} mode='signup' />
            </div>

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'>
                  Or continue with email
                </span>
              </div>
            </div>

            {error && (
              <div className='rounded-md bg-red-50 dark:bg-red-900/30 p-4'>
                <h3 className='text-sm font-medium text-red-800 dark:text-red-300'>
                  {error}
                </h3>
              </div>
            )}

            <form className='mt-8 space-y-6' onSubmit={handleSignup}>
              <div className='rounded-md shadow-sm -space-y-px'>
                <div>
                  <label htmlFor='email' className='sr-only'>
                    Email address
                  </label>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Email address'
                  />
                </div>
                <div>
                  <label htmlFor='password' className='sr-only'>
                    Password
                  </label>
                  <input
                    id='password'
                    name='password'
                    type='password'
                    autoComplete='new-password'
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Password'
                  />
                </div>
                <div>
                  <label htmlFor='confirm-password' className='sr-only'>
                    Confirm Password
                  </label>
                  <input
                    id='confirm-password'
                    name='confirm-password'
                    type='password'
                    autoComplete='new-password'
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Confirm password'
                  />
                </div>
              </div>

              <div>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {submitLabel}
                </button>
              </div>

              <div className='text-center md:text-left'>
                <Link
                  to={loginTo}
                  className='font-medium text-primary-600 hover:text-primary-500'
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </form>
          </div>

          {showPlanAside ? (
            <div className='order-1 md:order-2'>
              <SignupPlanSummary />
            </div>
          ) : null}
        </div>
      </ContentContainer>
    </div>
  );
}

export default function SignupPage() {
  const base = appBasePath();
  return (
    <BillingProvider<typeof beakerstackBillingConfig>
      supabase={supabase}
      config={beakerstackBillingConfig}
      checkoutSuccessUrl={`${base}/billing?checkout=success`}
      checkoutCancelUrl={`${base}/billing/plans?checkout=cancel`}
      portalReturnUrl={`${base}/billing`}
    >
      <SignupPageContent />
    </BillingProvider>
  );
}
