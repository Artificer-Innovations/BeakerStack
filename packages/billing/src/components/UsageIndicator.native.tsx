import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useUsage } from '../hooks/useUsage.js';
import type { ProductBillingConfig } from '../schema.js';
import type { UsageIndicatorProps } from './UsageIndicator.types.js';

export function UsageIndicator<P extends ProductBillingConfig>(
  props: UsageIndicatorProps<P>
): ReactElement {
  const { meter, variant = 'text', style, label, description } = props;
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
      <Text style={[styles.text, style]}>
        {loading ? '…' : `${used}/${lim}`}
      </Text>
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
      <View style={style}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        {!!description && <Text style={styles.description}>{description}</Text>}
        {limit != null && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        )}
        <Text style={styles.caption}>{capLine}</Text>
      </View>
    );
  }
  if (variant === 'bar' && limit !== null) {
    const pct = Math.min(100, (used / limit) * 100);
    return (
      <View style={style}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.caption}>{text}</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.text, style]}>
      {text}
      {remaining !== null ? ` · ${rem} left` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500', color: '#111827' },
  description: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  /** Matches web `mt-2` + `text-sm text-gray-600` on expanded caption */
  caption: { fontSize: 14, marginTop: 8, color: '#4b5563', lineHeight: 20 },
  /** Matches web `mt-2` before progress bar */
  track: {
    marginTop: 8,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: '#4f46e5', borderRadius: 999 },
});
