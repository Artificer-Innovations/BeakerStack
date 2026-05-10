import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useFeature } from '../hooks/useFeature.js';
import type { InferFeatureKeys, ProductBillingConfig } from '../schema.js';
import type { FeatureGateProps } from './FeatureGate.types.js';

export function FeatureGate<P extends ProductBillingConfig>(
  props: FeatureGateProps<P>
): ReactElement {
  const { feature, featureName, fallback, children, style } = props;
  const rawKey = feature ?? featureName;
  if (rawKey == null || rawKey === '') {
    return <>{fallback}</>;
  }
  const key = rawKey as InferFeatureKeys<P> & string;
  const { enabled, loading } = useFeature<P, typeof key>(key);
  if (loading) {
    return <View style={style} />;
  }
  if (!enabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
