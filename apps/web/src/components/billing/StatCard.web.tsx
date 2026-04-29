export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
      <p className='text-xs text-gray-500'>{label}</p>
      <p className='mt-1 text-base font-medium text-gray-900'>{value}</p>
    </div>
  );
}
