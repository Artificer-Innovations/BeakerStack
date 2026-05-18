export type AdminPaginationProps = {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
};

export function AdminPagination({
  total,
  limit,
  offset,
  onPageChange,
}: AdminPaginationProps) {
  const safeLimit = Math.max(1, limit);
  const page = Math.floor(offset / safeLimit) + 1;
  const totalPages =
    total === 0 ? 1 : Math.max(1, Math.ceil(total / safeLimit));
  const canPrev = offset > 0;
  const canNext = offset + safeLimit < total;
  const rangeEnd = total === 0 ? 0 : Math.min(offset + safeLimit, total);

  return (
    <div className='flex items-center justify-between gap-4 text-sm text-gray-600'>
      <p>
        {total === 0
          ? 'No results'
          : `Showing ${offset + 1}–${rangeEnd} of ${total}`}
      </p>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          disabled={!canPrev}
          onClick={() => onPageChange(Math.max(0, offset - safeLimit))}
          className='rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
        >
          Previous
        </button>
        <span className='px-2 tabular-nums'>
          Page {page} of {totalPages}
        </span>
        <button
          type='button'
          disabled={!canNext}
          onClick={() => onPageChange(offset + safeLimit)}
          className='rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
        >
          Next
        </button>
      </div>
    </div>
  );
}
