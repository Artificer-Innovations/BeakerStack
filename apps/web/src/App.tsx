import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { BillingProviderLayout } from './billing/BillingProviderLayout';
import { AppFooter } from './components/AppFooter';
import { AppErrorBoundary } from './components/AppErrorBoundary';

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
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const BillingOverviewPage = lazy(
  () => import('./pages/billing/BillingOverviewPage')
);
const BillingUsagePage = lazy(() => import('./pages/billing/BillingUsagePage'));
const BillingPlansPage = lazy(() => import('./pages/billing/BillingPlansPage'));
const BillingInvoicesPage = lazy(
  () => import('./pages/billing/BillingInvoicesPage')
);

function RootLayout() {
  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex-1'>
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}

function App() {
  return (
    <div className='bg-gray-50 dark:bg-gray-900'>
      <AppErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path='/' element={<HomePage />} />
              <Route path='/login' element={<LoginPage />} />
              <Route path='/signup' element={<SignupPage />} />
              <Route path='/terms' element={<PolicyPage policy='terms' />} />
              <Route
                path='/privacy'
                element={<PolicyPage policy='privacy' />}
              />
              <Route
                path='/refunds'
                element={<PolicyPage policy='refunds' />}
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
                <Route element={<BillingProviderLayout />}>
                  <Route path='/dashboard' element={<DashboardPage />} />
                  <Route path='/billing' element={<BillingOverviewPage />} />
                  <Route path='/billing/usage' element={<BillingUsagePage />} />
                  <Route path='/billing/plans' element={<BillingPlansPage />} />
                  <Route
                    path='/billing/invoices'
                    element={<BillingInvoicesPage />}
                  />
                </Route>
              </Route>
              <Route path='/auth/callback' element={<AuthCallbackPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </div>
  );
}

export default App;
