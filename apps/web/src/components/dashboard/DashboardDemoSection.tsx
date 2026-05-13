import type { ReactNode } from 'react';

export type DashboardDemoSectionProps = {
  title: string;
  demonstrates: string;
  description: string;
  codeReference: string;
  children: ReactNode;
  variant?: 'default' | 'demo-mode';
};

export function DashboardDemoSection({
  title,
  demonstrates,
  description,
  codeReference,
  children,
  variant = 'default',
}: DashboardDemoSectionProps) {
  const borderClass =
    variant === 'demo-mode'
      ? 'border-dashed border-gray-300 dark:border-gray-600'
      : 'border-gray-200 dark:border-gray-700';
  return (
    <div
      className={`relative rounded-xl border ${borderClass} bg-white dark:bg-gray-800 p-6 shadow-sm`}
    >
      {variant === 'demo-mode' && (
        <span className='absolute right-4 top-3 rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300'>
          Demo mode only
        </span>
      )}
      <h2 className='pr-32 text-lg font-semibold text-gray-900 dark:text-white'>
        {title}
      </h2>
      <p className='mt-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'>
        Demonstrates:{' '}
        <span className='font-mono text-sm font-normal text-gray-700 dark:text-gray-300'>
          {demonstrates}
        </span>
      </p>
      <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
        {description}
      </p>
      <div className='mt-4'>{children}</div>
      <p className='mt-4 text-xs font-mono text-gray-500 dark:text-gray-400'>
        // {codeReference}
      </p>
    </div>
  );
}
