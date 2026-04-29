/** Invoice / generic status (not subscription — see SubscriptionStatusBadge in @beakerstack/billing/web). */

const base =
  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize';

const styles: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-800' },
  open: { label: 'Open', cls: 'bg-blue-100 text-blue-800' },
  uncollectible: { label: 'Failed', cls: 'bg-red-100 text-red-800' },
  void: { label: 'Void', cls: 'bg-gray-100 text-gray-800' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-800' },
  refunded: { label: 'Refunded', cls: 'bg-gray-100 text-gray-800' },
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}): JSX.Element {
  const s = (status || '').toLowerCase();
  const m = styles[s] ?? { label: status, cls: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`${base} ${m.cls} ${className}`.trim()}>{m.label}</span>
  );
}
