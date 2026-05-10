import type { HTMLAttributes } from 'react';

export type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'full';
} & Omit<HTMLAttributes<HTMLDivElement>, 'width' | 'height'>;

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-md',
  full: 'rounded-full',
};

/**
 * Animated placeholder block (web).
 */
function SkeletonBlock({
  className = '',
  width,
  height,
  rounded = 'md',
  style,
  ...rest
}: SkeletonProps) {
  const hasWidthClass = /\bw-/.test(className);
  return (
    <div
      className={[
        'animate-pulse bg-gray-200',
        !width && !hasWidthClass ? 'w-full' : '',
        roundedMap[rounded],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width,
        height: height ?? 16,
        minHeight: height ?? 16,
        ...style,
      }}
      role='status'
      aria-label='Loading'
      {...rest}
    />
  );
}

export type SkeletonTextProps = {
  lines?: number;
  className?: string;
  lastLineWidth?: 'full' | '3/4' | '1/2';
};

/**
 * Stacked line skeletons for text placeholders.
 */
function SkeletonTextBlock({
  lines = 3,
  className = '',
  lastLineWidth = '3/4',
}: SkeletonTextProps) {
  const lastW =
    lastLineWidth === 'full'
      ? 'w-full'
      : lastLineWidth === '1/2'
        ? 'w-1/2'
        : 'w-3/4';
  return (
    <div
      className={['space-y-2 w-full', className].filter(Boolean).join(' ')}
      role='status'
      aria-label='Loading'
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={`skeleton-line-${i}`}
          height={12}
          className={i === lines - 1 ? lastW : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * `Skeleton` block plus `Skeleton.Text` multi-line helper.
 */
export const Skeleton = Object.assign(SkeletonBlock, {
  Text: SkeletonTextBlock,
});
