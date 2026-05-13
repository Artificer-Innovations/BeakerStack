import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { BillingProviderLayout } from './billing/BillingProviderLayout';
import { AppFooter } from './components/AppFooter';
import { ErrorBoundary } from '@beakerstack/shared';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import PolicyPage from './pages/PolicyPage';
import BillingOverviewPage from './pages/billing/BillingOverviewPage';
import BillingUsagePage from './pages/billing/BillingUsagePage';
import BillingPlansPage from './pages/billing/BillingPlansPage';
import BillingInvoicesPage from './pages/billing/BillingInvoicesPage';

const HomePage = lazy(() => import('./pages/HomePage'));

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
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path='/'
            element={
              <ErrorBoundary level='screen'>
                <Suspense fallback={null}>
                  <HomePage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path='/login' element={<ErrorBoundary level='screen'><LoginPage /></ErrorBoundary>} />
          <Route path='/signup' element={<ErrorBoundary level='screen'><SignupPage /></ErrorBoundary>} />
          <Route path='/terms' element={<ErrorBoundary level='screen'><PolicyPage policy='terms' /></ErrorBoundary>} />
          <Route path='/privacy' element={<ErrorBoundary level='screen'><PolicyPage policy='privacy' /></ErrorBoundary>} />
          <Route path='/refunds' element={<ErrorBoundary level='screen'><PolicyPage policy='refunds' /></ErrorBoundary>} />
          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <ErrorBoundary level='screen'>
                  <ProfilePage />
                </ErrorBoundary>
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
              <Route path='/dashboard' element={<ErrorBoundary level='screen'><DashboardPage /></ErrorBoundary>} />
              <Route path='/billing' element={<ErrorBoundary level='screen'><BillingOverviewPage /></ErrorBoundary>} />
              <Route path='/billing/usage' element={<ErrorBoundary level='screen'><BillingUsagePage /></ErrorBoundary>} />
              <Route path='/billing/plans' element={<ErrorBoundary level='screen'><BillingPlansPage /></ErrorBoundary>} />
              <Route
                path='/billing/invoices'
                element={<ErrorBoundary level='screen'><BillingInvoicesPage /></ErrorBoundary>}
              />
            </Route>
          </Route>
          <Route path='/auth/callback' element={<ErrorBoundary level='screen'><AuthCallbackPage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
