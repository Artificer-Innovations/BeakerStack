import { BillingProvider } from '@beakerstack/billing';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { AppHeaderWithAdmin } from '../components/AppHeaderWithAdmin';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { supabase } from '@/lib/supabase';
import { SocialLoginButton } from '../components/SocialLoginButton';
import { LoginPlanSummary } from '../components/auth/SignupPlanSummary';
import { billingConfig } from '@adopter/config/billing';
import {
  clearPostAuthRedirectKeys,
  POST_AUTH_REDIRECT_KEY,
  resolvePostAuthDestination,
  serializePostAuthRedirectPayload,
  validateInternalPostAuthPath,
} from '../auth/postAuthRedirect';
import { appBasePath } from '../lib/appBasePath';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const auth = useAuthContext();
  const postLoginPath = getAdopterConfig().postLoginPath;

  const fromState = (location.state as { from?: string } | null)?.from;
  const fromRedirect =
    fromState &&
    validateInternalPostAuthPath(fromState) &&
    fromState !== postLoginPath
      ? fromState
      : null;

  const postAuthPath = fromRedirect ?? resolvePostAuthDestination(searchParams);
  const signupSearch = searchParams.toString();
  const signupTo = signupSearch ? `/signup?${signupSearch}` : '/signup';

  const stashOAuthIntent = () => {
    if (postAuthPath !== postLoginPath) {
      sessionStorage.setItem(
        POST_AUTH_REDIRECT_KEY,
        serializePostAuthRedirectPayload(postAuthPath)
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await auth.signIn(email, password);
      clearPostAuthRedirectKeys();
      navigate(postAuthPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      stashOAuthIntent();
      await auth.signInWithGoogle();
    } catch (err) {
      sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      setError(
        err instanceof Error ? err.message : 'Failed to sign in with Google'
      );
    }
  };

  const showPlanAside = postAuthPath !== postLoginPath;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeaderWithAdmin />
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
              <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white md:mt-0 md:text-left'>
                Sign in to your account
              </h2>
            </div>

            <div className='space-y-3'>
              <SocialLoginButton onPress={handleGoogleLogin} mode='signin' />
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

            <form className='mt-8 space-y-6' onSubmit={handleLogin}>
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
                    autoComplete='current-password'
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Password'
                  />
                </div>
              </div>

              <div className='text-right'>
                <Link
                  to='/forgot-password'
                  className='text-sm font-medium text-primary-600 hover:text-primary-500'
                >
                  Forgot password?
                </Link>
              </div>

              <div>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div className='text-center md:text-left'>
                <Link
                  to={signupTo}
                  className='font-medium text-primary-600 hover:text-primary-500'
                >
                  Don&apos;t have an account? Sign up
                </Link>
              </div>
            </form>
          </div>

          {showPlanAside ? (
            <div className='order-1 md:order-2'>
              <LoginPlanSummary />
            </div>
          ) : null}
        </div>
      </ContentContainer>
    </div>
  );
}

export default function LoginPage() {
  const base = appBasePath();
  return (
    <BillingProvider<typeof billingConfig>
      supabase={supabase}
      config={billingConfig}
      checkoutSuccessUrl={`${base}/billing?checkout=success`}
      checkoutCancelUrl={`${base}/billing/plans?checkout=cancel`}
      portalReturnUrl={`${base}/billing`}
    >
      <LoginPageContent />
    </BillingProvider>
  );
}
