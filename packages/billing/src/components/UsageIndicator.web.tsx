import type { ReactElement } from 'react';
import { useUsage } from '../hooks/useUsage.js';
import type { ProductBillingConfig } from '../schema.js';
import type { UsageIndicatorProps } from './UsageIndicator.types.js';

export function UsageIndicator<P extends ProductBillingConfig>(
  props: UsageIndicatorProps<P>
): ReactElement {
  const {
    meter,
    variant = 'text',
    className,
    style,
    label,
    description,
  } = props;
  const { used, limit, remaining, resetsAt, loading } = useUsage<
    P,
    typeof meter
  >(meter);
  const lim = limit === null ? '∞' : String(limit);
  const rem = remaining === null ? '∞' : String(remaining);
  const text = loading
    ? '…'
    : `${used} of ${lim} used · resets ${resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'}`;
  const textUnlimited = loading
    ? '…'
    : limit === null
      ? `${used} used this period · unlimited`
      : text;
  if (variant === 'compact') {
    return (
      <span className={className} style={style as React.CSSProperties}>
        {loading ? '…' : `${used}/${lim}`}
      </span>
    );
  }
  if (variant === 'expanded') {
    const capLine =
      limit === null
        ? textUnlimited
        : `${used} of ${lim} used · resets ${resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'}`;
    const pct =
      limit != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    return (
      <div
        className={className}
        style={style as React.CSSProperties}
        data-testid='usage-indicator-expanded'
      >
        {label && (
          <div className='text-sm font-medium text-gray-900 dark:text-white'>
            {label}
          </div>
        )}
        {description && (
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
            {description}
          </p>
        )}
        {limit != null && (
          <div className='mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-2 rounded-full bg-indigo-600 dark:bg-indigo-500'
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
          {capLine}
        </div>
      </div>
    );
  }
  if (variant === 'bar' && limit !== null) {
    const pct = Math.min(100, (used / limit) * 100);
    return (
      <div className={className} style={style as React.CSSProperties}>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
          <div
            style={{
              width: `${pct}%`,
              height: 8,
              background: '#3b82f6',
              borderRadius: 4,
            }}
          />
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{text}</div>
      </div>
    );
  }
  return (
    <div className={className} style={style as React.CSSProperties}>
      {text}
      {remaining !== null && <span> · {rem} left</span>}
    </div>
  );
}
