import type { ReactNode } from 'react';
import { ErrorBoundary } from '@beakerstack/observability/web';

function AppErrorFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
      <div className='max-w-md text-center'>
        <p className='text-gray-900 dark:text-white font-semibold'>
          Something went wrong.
        </p>
        <button
          type='button'
          onClick={() => window.location.reload()}
          className='mt-4 text-sm text-indigo-600 hover:text-indigo-500'
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>{children}</ErrorBoundary>
  );
}
