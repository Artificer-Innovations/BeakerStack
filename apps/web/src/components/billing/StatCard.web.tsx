export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'>
      <p className='text-xs text-gray-500 dark:text-gray-400'>{label}</p>
      <p className='mt-1 text-base font-medium text-gray-900 dark:text-white'>
        {value}
      </p>
    </div>
  );
}
