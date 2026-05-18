import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayoutShell } from './AdminLayoutShell';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

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
        </Route>
      </Routes>
    </Suspense>
  );
}
