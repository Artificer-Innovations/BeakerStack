import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AdminRoute } from '@beakerstack/admin/web';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { supabase } from './lib/supabase';
import { AppFooter } from './components/AppFooter';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { LAYOUT } from './lib/layoutConstants';

function PageFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
    </div>
  );
}

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const SignupInvitePage = lazy(() => import('./pages/SignupInvitePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirmPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const BillingOverviewPage = lazy(
  () => import('./pages/billing/BillingOverviewPage')
);
const BillingUsagePage = lazy(() => import('./pages/billing/BillingUsagePage'));
const BillingPlansPage = lazy(() => import('./pages/billing/BillingPlansPage'));
const BillingInvoicesPage = lazy(
  () => import('./pages/billing/BillingInvoicesPage')
);

/** Deferred so `/` does not pull supabase-vendor via BillingProviderLayout. */
const BillingProviderLayout = lazy(() =>
  import('./billing/BillingProviderLayout').then(m => ({
    default: m.BillingProviderLayout,
  }))
);

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const NotAuthorizedPage = lazy(() => import('./pages/NotAuthorizedPage'));

function RootLayout() {
  return (
    <div className={LAYOUT.shell}>
      <div className={LAYOUT.content}>
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}

function AdminRouteGate({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  return (
    <AdminRoute
      supabase={supabase}
      userId={auth.user?.id}
      authLoading={auth.loading}
    >
      {children}
    </AdminRoute>
  );
}

function App() {
  return (
    <div className={LAYOUT.outer}>
      <AppErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path='/' element={<HomePage />} />
              <Route path='/terms' element={<PolicyPage policy='terms' />} />
              <Route
                path='/privacy'
                element={<PolicyPage policy='privacy' />}
              />
              <Route
                path='/refunds'
                element={<PolicyPage policy='refunds' />}
              />
            </Route>

            <Route
              element={
                <Suspense fallback={<PageFallback />}>
                  <AuthenticatedApp />
                </Suspense>
              }
            >
              <Route
                path='/admin/*'
                element={
                  <AdminRouteGate>
                    <Suspense fallback={<PageFallback />}>
                      <AdminApp />
                    </Suspense>
                  </AdminRouteGate>
                }
              />
              <Route element={<RootLayout />}>
                <Route path='/login' element={<LoginPage />} />
                <Route path='/signup' element={<SignupPage />} />
                <Route path='/signup/invite' element={<SignupInvitePage />} />
                <Route
                  path='/forgot-password'
                  element={<ForgotPasswordPage />}
                />
                <Route path='/reset-password' element={<ResetPasswordPage />} />
                <Route path='/auth/callback' element={<AuthCallbackPage />} />
                <Route path='/auth/confirm' element={<AuthConfirmPage />} />
                <Route
                  path='/not-authorized'
                  element={
                    <ProtectedRoute redirectTo='/login'>
                      <NotAuthorizedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/profile'
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <Outlet />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <BillingProviderLayout />
                      </Suspense>
                    }
                  >
                    <Route path='/dashboard' element={<DashboardPage />} />
                    <Route path='/billing' element={<BillingOverviewPage />} />
                    <Route
                      path='/billing/usage'
                      element={<BillingUsagePage />}
                    />
                    <Route
                      path='/billing/plans'
                      element={<BillingPlansPage />}
                    />
                    <Route
                      path='/billing/invoices'
                      element={<BillingInvoicesPage />}
                    />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </div>
  );
}

export default App;
