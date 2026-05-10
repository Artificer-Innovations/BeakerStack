import type { ReactNode } from 'react';

export type BannerVariant = 'info' | 'success' | 'warning' | 'error';

const variantClass: Record<BannerVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-red-50 border-red-200 text-red-900',
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
}): JSX.Element {
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
