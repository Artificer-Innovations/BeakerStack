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
      ? 'border-dashed border-gray-300'
      : 'border-gray-200';
  return (
    <div
      className={`relative rounded-xl border ${borderClass} bg-white p-6 shadow-sm`}
    >
      {variant === 'demo-mode' && (
        <span className='absolute right-4 top-3 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'>
          Demo mode only
        </span>
      )}
      <h2 className='pr-32 text-lg font-semibold text-gray-900'>{title}</h2>
      <p className='mt-1 text-xs font-medium uppercase tracking-wide text-gray-500'>
        Demonstrates:{' '}
        <span className='font-mono text-sm font-normal text-gray-700'>
          {demonstrates}
        </span>
      </p>
      <p className='mt-2 text-sm text-gray-600'>{description}</p>
      <div className='mt-4'>{children}</div>
      <p className='mt-4 text-xs font-mono text-gray-500'>// {codeReference}</p>
    </div>
  );
}
