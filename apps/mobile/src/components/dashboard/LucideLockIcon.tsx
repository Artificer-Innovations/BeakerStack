import React, { type ReactElement } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Lucide `Lock` (16px) — matches web FeatureGateCard fallback icon. */
export function LucideLockIcon({
  size = 16,
  color = '#9333ea',
}: {
  size?: number;
  color?: string;
}): ReactElement {
  return (
    <Svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      accessible={false}
    >
      <Rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
      <Path d='M7 11V7a5 5 0 0 1 10 0v4' />
    </Svg>
  );
}
