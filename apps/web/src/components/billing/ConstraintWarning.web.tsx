export function ConstraintWarning({ message }: { message: string }) {
  return (
    <div
      className='mb-3 rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-200'
      role='status'
    >
      {message}
    </div>
  );
}
