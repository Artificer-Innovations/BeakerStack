export function FeatureLimitRow({
  name,
  used,
  cap,
  capIsUnlimited,
}: {
  name: string;
  used: number | null;
  cap: number;
  capIsUnlimited: boolean;
}) {
  const u = used ?? 0;
  if (capIsUnlimited) {
    return (
      <div className='flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2 text-sm'>
        <span className='text-gray-900 dark:text-white'>{name}</span>
        <span className='text-gray-600 dark:text-gray-400'>
          {u} of unlimited
        </span>
      </div>
    );
  }
  const ratio = cap > 0 ? u / cap : 0;
  const heavy = ratio >= 0.8 && u < cap;
  const at = u >= cap;
  return (
    <div
      className={`flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2 text-sm ${
        at
          ? 'text-red-700 dark:text-red-400'
          : heavy
            ? 'text-amber-800 dark:text-amber-400'
            : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      <span className='text-gray-900 dark:text-white'>{name}</span>
      <span>
        {u} of {cap}
      </span>
    </div>
  );
}
