import type { ReactElement } from 'react';
import type { ReactNode } from 'react';

export type BannerVariant = 'info' | 'success' | 'warning' | 'error';

const variantClass: Record<BannerVariant, string> = {
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  success:
    'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  warning:
    'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  error:
    'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
};

export function Banner({
  variant = 'info',
  title,
  children,
  action,
  className = '',
}: {
  variant?: BannerVariant;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={`rounded-lg border p-4 ${variantClass[variant]} ${className}`.trim()}
      role='status'
    >
      {title && <p className='font-medium'>{title}</p>}
      <p className={title ? 'mt-1 text-sm' : 'text-sm'}>{children}</p>
      {action && <div className='mt-3'>{action}</div>}
    </div>
  );
}
