/** Invoice / generic status (not subscription — see SubscriptionStatusBadge in @beakerstack/billing/web). */

const base =
  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize';

const styles: Record<string, { label: string; cls: string }> = {
  paid: {
    label: 'Paid',
    cls: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  },
  open: {
    label: 'Open',
    cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  },
  uncollectible: {
    label: 'Failed',
    cls: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  },
  void: {
    label: 'Void',
    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  },
  draft: {
    label: 'Draft',
    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  },
  refunded: {
    label: 'Refunded',
    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  },
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}): JSX.Element {
  const s = (status || '').toLowerCase();
  const m = styles[s] ?? {
    label: status,
    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  };
  return (
    <span className={`${base} ${m.cls} ${className}`.trim()}>{m.label}</span>
  );
}
