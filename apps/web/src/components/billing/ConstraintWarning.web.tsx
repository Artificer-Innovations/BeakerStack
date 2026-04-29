export function ConstraintWarning({ message }: { message: string }) {
  return (
    <div
      className='mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'
      role='status'
    >
      {message}
    </div>
  );
}
