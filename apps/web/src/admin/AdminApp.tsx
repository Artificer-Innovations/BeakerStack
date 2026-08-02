import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AdminLayoutShell } from './AdminLayoutShell';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminWaitlistPage = lazy(() => import('./pages/AdminWaitlistPage'));
const AdminWaitlistSettingsPage = lazy(
  () => import('./pages/AdminWaitlistSettingsPage')
);
const AdminMarketingEmailSettingsPage = lazy(
  () => import('./pages/AdminMarketingEmailSettingsPage')
);

function PageFallback() {
  return (
    <div className='flex justify-center py-12'>
      <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600' />
    </div>
  );
}

export default function AdminApp() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AdminLayoutShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path='users' element={<AdminUsersPage />} />
          <Route path='waitlist' element={<AdminWaitlistPage />} />
          <Route
            path='waitlist/settings'
            element={<AdminWaitlistSettingsPage />}
          />
          <Route
            path='marketing-email/settings'
            element={<AdminMarketingEmailSettingsPage />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
