import { lazy, Suspense } from 'react';
import type { AdopterRouteExtension } from '@beakerstack/shared/navigation/adopterExtensions';

function PageFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
    </div>
  );
}

const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export const adopterRouteExtensions: AdopterRouteExtension[] = [
  {
    path: '/dashboard',
    auth: 'protected',
    element: (
      <Suspense fallback={<PageFallback />}>
        <DashboardPage />
      </Suspense>
    ),
  },
];
