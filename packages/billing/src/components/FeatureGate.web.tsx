import type { ReactElement } from 'react';
import { useFeature } from '../hooks/useFeature.js';
import type { InferFeatureKeys, ProductBillingConfig } from '../schema.js';
import type { FeatureGateProps } from './FeatureGate.types.js';

export function FeatureGate<P extends ProductBillingConfig>(
  props: FeatureGateProps<P>
): ReactElement {
  const { feature, featureName, fallback, children, className, style } = props;
  const rawKey = feature ?? featureName;
  if (rawKey == null || rawKey === '') {
    return <>{fallback}</>;
  }
  const key = rawKey as InferFeatureKeys<P> & string;
  const { enabled, loading } = useFeature<P, typeof key>(key);
  if (loading) {
    return <span className={className} style={style as React.CSSProperties} />;
  }
  if (!enabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
