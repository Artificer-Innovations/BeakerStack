import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { BillingProviderLayout } from './billing/BillingProviderLayout';
import { AppFooter } from './components/AppFooter';
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
    <div className='bg-gray-50'>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path='/'
            element={
              <Suspense fallback={null}>
                <HomePage />
              </Suspense>
            }
          />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />
          <Route path='/terms' element={<PolicyPage policy='terms' />} />
          <Route path='/privacy' element={<PolicyPage policy='privacy' />} />
          <Route path='/refunds' element={<PolicyPage policy='refunds' />} />
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
    </div>
  );
}

export default App;
