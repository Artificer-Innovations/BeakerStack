import { Routes, Route, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { BillingProviderLayout } from './billing/BillingProviderLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import BillingOverviewPage from './pages/billing/BillingOverviewPage';
import BillingUsagePage from './pages/billing/BillingUsagePage';
import BillingPlansPage from './pages/billing/BillingPlansPage';
import BillingInvoicesPage from './pages/billing/BillingInvoicesPage';

function App() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
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
            <Route path='/billing/invoices' element={<BillingInvoicesPage />} />
          </Route>
        </Route>
        <Route path='/auth/callback' element={<AuthCallbackPage />} />
      </Routes>
    </div>
  );
}

export default App;
