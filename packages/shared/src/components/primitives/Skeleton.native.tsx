import { View, type ViewStyle } from 'react-native';

export type SkeletonProps = {
  className?: string;
  width?: number | string;
  height?: number;
  rounded?: 'none' | 'sm' | 'md' | 'full';
  style?: ViewStyle;
};

const bg = '#E5E7EB';

const borderRadius: Record<NonNullable<SkeletonProps['rounded']>, number> = {
  none: 0,
  sm: 4,
  md: 6,
  full: 9999,
};

/**
 * Simple gray placeholder (native) — no pulse animation in v1.
 */
function SkeletonBlock({
  width: w = '100%',
  height: h = 16,
  rounded = 'md',
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        {
          width: w as number | `${number}%`,
          height: h,
          backgroundColor: bg,
          borderRadius: borderRadius[rounded],
        },
        style,
      ]}
      accessibilityRole='progressbar'
    />
  );
}

export type SkeletonTextProps = {
  lines?: number;
  className?: string;
  lastLineWidth?: 'full' | '3/4' | '1/2';
};

function SkeletonTextBlock({
  lines = 3,
  lastLineWidth = '3/4',
}: SkeletonTextProps) {
  const lastWPercent: `${number}%` =
    lastLineWidth === 'full' ? '100%' : lastLineWidth === '1/2' ? '50%' : '75%';
  return (
    <View style={{ width: '100%' }} accessibilityRole='progressbar'>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={`skeleton-line-${i}`}
          style={{
            width: '100%',
            marginTop: i === 0 ? 0 : 8,
          }}
        >
          <View
            style={{
              width: i === lines - 1 ? lastWPercent : '100%',
              height: 12,
              backgroundColor: bg,
              borderRadius: 6,
            }}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * `Skeleton` block plus `Skeleton.Text` multi-line helper.
 */
export const Skeleton = Object.assign(SkeletonBlock, {
  Text: SkeletonTextBlock,
});
